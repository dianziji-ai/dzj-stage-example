/**
 * 按标签挑图：立绘、背景、CG 都用同一套。★图和规则全在卡的配图库里（snap.image_pack），作者改图库就行，不改舞台代码。
 *
 * ── 卡上怎么配（网站编辑器「配图库」）──
 *   分组名用「/」分段：第一段是类别，后面每段是一个标签。一张图可以进好几个组，标签合起来算。
 *     立绘/柳月儿/日常装          这几张是日常装
 *     立绘/柳月儿/开心|笑|高兴     这几张是开心；「|」后面是近义词（AI 写了「笑」也认成开心）
 *     立绘/柳月儿/迷离|害羞|哭泣   性爱组没有害羞那张：AI 写「害羞」时先找真正标着害羞的，没有才退到这里（越靠前越优先）
 *     背景/电玩城/晚上             电玩城 · 晚上
 *   特殊标签「默认」：立绘/默认 组里的图在同分时优先（没写穿着、又没有上一张时穿哪件），它不算多余标签。
 *   标签可以带「键=」：立绘/电子姬/表情=开心|笑、立绘/电子姬/动作=打游戏|手柄。带键的标签只和同键的维度比（dims 里写 key），
 *     AI 写的是一句自由文本（「动作：开心地跳起来」）时尤其要带：不然「开心」会被当成动作对上。不带键＝谁都能比。
 *   ★这些组的画廊闸门设 -1（不进图册）；平台不把配图库给 AI 看，放多少图都不影响提示词。
 *
 * ── 舞台怎么挑 ──
 *   AI 每句写几个描述（谁 / 行为 / 穿着 / 表情…），舞台按重要性从高到低排成 dims：
 *     pickImage(snap, '立绘', [{ value: row['谁'], must: true }, { value: row['穿着'] }, { value: row['表情'] }], { seed: 这句话, prev: 上一张 })
 *
 *   每一维、每张图看「对得多准」：
 *     正好是标签名 > 正好是它的近义词（越靠前越好）> AI 的词里包含标签名 / 近义词（包含的越长越准：「不开心」先于「开心」）> 对不上
 *   逐张比：重要的维度先比；还一样 → 和上一张（prev）共有的标签多的（没写穿着 / 穿着认不出时留在同一套衣服里）
 *   → 在「默认」组里的 → 多余的标签少的（最朴素的那张）→ 按 seed 固定挑一张（同一句回看永远同一张，同类多张轮着出）。
 *   must 的维度写了却哪张都对不上 → null（调用方沿用上一张，画面不会空）。
 */
import type { StageImage, StageImagePack, StageSnapshot } from '../client'

/** 一个描述维度：AI 写的词。空 / 不是字符串＝没写，这一维不参与 */
export type PickDim = {
  value: unknown
  /** 只和这个键的标签比（组名里写成「键=标签」）；不写＝和所有标签比 */
  key?: string
  /** 必须对上：写了却哪张都对不上 → 整个返回 null；没写不限制。一般只给「谁」 */
  must?: boolean
}

export type PickOptions = {
  /** 同分多张时固定挑哪张：传这句话的原文或编号，同一句永远同一张 */
  seed?: number | string
  /** 上一张（图或编号）：同分时挑和它共有标签多的，画面连贯 */
  prev?: StageImage | number | null
}

type Pack = Pick<StageSnapshot, 'image_pack'>
/** 一个标签：key＝「键=」前面那段（没有＝''），words[0]＝名字，后面是近义词 */
type Tag = { key: string; words: string[] }
const idOf = (t: Tag) => (t.key ? `${t.key}=${t.words[0]}` : t.words[0])
type Entry = { img: StageImage; tags: Tag[] }

function tagsOf(img: Pick<StageImage, 'g'>, kind: string): Tag[] | null {
  let hit = false
  const out = new Map<string, Tag>()
  for (const name of img.g ?? []) {
    const [head, ...rest] = name.split('/').map((s) => s.trim())
    if (head !== kind) continue
    hit = true
    for (const seg of rest) {
      const eq = seg.indexOf('=')
      const key = eq > 0 ? seg.slice(0, eq).trim() : ''
      const words = (eq > 0 ? seg.slice(eq + 1) : seg).split('|').map((s) => s.trim()).filter(Boolean)
      if (!words.length) continue
      const tag = { key, words }
      const had = out.get(idOf(tag))
      if (had) had.words.push(...words.slice(1).filter((w) => !had.words.includes(w)))
      else out.set(idOf(tag), tag)
    }
  }
  return hit ? [...out.values()] : null
}

/** 一张图在某个类别下的标签（不含近义词；带键的写成「键=名字」）；不属于这个类别＝null */
export function imageTags(img: Pick<StageImage, 'g'>, kind: string): string[] | null {
  return tagsOf(img, kind)?.map(idOf) ?? null
}

/** 某个类别下出现过的标签名（去重，按出现顺序）。传 key＝只要这个键的（不带「键=」）：写提示词词表、调试用 */
export function imageVocab(snap: Pack, kind: string, key?: string): string[] {
  const out = new Set<string>()
  for (const img of snap.image_pack?.images ?? []) for (const t of tagsOf(img, kind) ?? []) if (key === undefined || t.key === key) out.add(key === undefined ? idOf(t) : t.words[0])
  return [...out]
}

/** 一个词对一张图有多准：[2 正好 / 1 包含 / 0 对不上, 包含的长度, -近义词位次]（逐项比，大的好） */
function fit(v: string, tags: Tag[], key: string | undefined): number[] {
  let best = [0, 0, 0]
  for (const t of tags) {
    if (key !== undefined && t.key !== key) continue
    t.words.forEach((w, i) => {
      const q = v === w ? [2, 0, -i] : v.includes(w) ? [1, w.length, -i] : null
      if (q && compare(q, best) > 0) best = q
    })
  }
  return best
}

const DEFAULT = '默认'
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')

function hash(seed: number | string): number {
  if (typeof seed === 'number') return Math.abs(Math.trunc(seed))
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** 按描述挑一张图（规则见文件头）。挑不出＝null：调用方沿用上一张。返回配图库里的那张（src＝地址，n＝编号） */
export function pickImage(snap: Pack, kind: string, dims: readonly PickDim[], opts: PickOptions = {}): StageImage | null {
  let pool = poolOf(snap.image_pack, kind)
  const words = dims.map((d) => text(d.value))
  for (let i = 0; i < dims.length; i++) {
    if (!dims[i].must || !words[i]) continue
    pool = pool.filter((p) => fit(words[i], p.tags, dims[i].key)[0] > 0)
  }
  if (!pool.length) return null

  const prevN = typeof opts.prev === 'number' ? opts.prev : opts.prev?.n
  const prevTags = new Set(pool.length && prevN != null ? (imageTags(snap.image_pack?.images?.find((im) => im.n === prevN) ?? {}, kind) ?? []) : [])

  let best: { img: StageImage; key: number[] }[] = []
  for (const p of pool) {
    const key: number[] = []
    let hits = 0
    for (let i = 0; i < words.length; i++) {
      const q = words[i] ? fit(words[i], p.tags, dims[i].key) : [0, 0, 0]
      if (q[0] > 0) hits++
      key.push(...q)
    }
    key.push(p.tags.filter((t) => prevTags.has(idOf(t))).length) // 和上一张共有的标签
    const def = p.tags.some((t) => !t.key && t.words[0] === DEFAULT) ? 1 : 0
    key.push(def) // 作者标成「默认」的优先
    key.push(hits + def - p.tags.length) // 多余的标签越少越好（「默认」不算多余）
    const cmp = best.length ? compare(key, best[0].key) : 1
    if (cmp > 0) best = [{ img: p.img, key }]
    else if (cmp === 0) best.push({ img: p.img, key })
  }
  best.sort((a, b) => a.img.n - b.img.n)
  return best[hash(opts.seed ?? 0) % best.length].img
}

function poolOf(pack: StageImagePack | null | undefined, kind: string): Entry[] {
  const out: Entry[] = []
  for (const img of pack?.images ?? []) {
    const tags = tagsOf(img, kind)
    if (tags && img.src) out.push({ img, tags })
  }
  return out
}

function compare(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]
  return 0
}
