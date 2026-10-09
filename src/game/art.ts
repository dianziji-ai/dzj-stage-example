/**
 * 这张卡的图怎么挑：立绘、背景、地图。★图和挑图规则全在卡的配图库里，舞台代码里一张图、一个词表都没有。
 * 作者加一套衣服、加一个动作、给某个地点补夜景，只改配图库（网站编辑器「配图库」），不用改代码、不用重新上传舞台。
 *
 * 配图库的分组（类别 / 键=标签|近义词…，一张图可以进好几个组，详见 SDK 的 pickImage 和 docs/example-card.md）：
 *   立绘/谁=电子姬                     她的全部立绘
 *   立绘/穿着=卫衣|小鸡卫衣|连帽衫      立绘/穿着=睡衣|睡裙|家居服    立绘/穿着=外出服|连衣裙|裙子
 *   立绘/表情=开心|笑|高兴…            （8 种表情，每种一个组）
 *   立绘/动作=打游戏|游戏|手柄          立绘/动作=睡着|睡觉|打瞌睡|困
 *   立绘/默认                          小鸡卫衣那 8 张：没写穿着、又没有上一张时穿它
 *   背景/地点=home|房间|主人的房间      背景/时段=白天|早上…   背景/时段=晚上|傍晚|夜…
 *   地图                              大地图
 *
 * AI 每句写的（卡的对话区 / 场景区）→ 挑图时的维度，从重要到次要：
 *   立绘：谁（必须对上）→ 动作（一句话的小动作，包含「手柄」「打瞌睡」这类词就算）→ 穿着（场景区）→ 表情
 *   背景：地点（必须对上）→ 时段（场景区的时间换算成白天 / 晚上）
 */
import { imageTags, pickImage, type StageImage, type StageSnapshot } from '@dianziji/stage'
import { CHAR_NAME } from './content'

type Pack = Pick<StageSnapshot, 'image_pack'>

/** 她这一句的样子（对话区原文，不认词表：认词交给配图库） */
export type Look = { expr: string; act: string; seed: string }
export const NO_LOOK: Look = { expr: '', act: '', seed: '' }
/** 两个样子是不是同一个（对象每次解析都是新的，比内容） */
export const sameLook = (a: Look, b: Look) => a.expr === b.expr && a.act === b.act && a.seed === b.seed

/** 立绘：prev＝上一张（没写穿着、穿着认不出时留在同一套）。挑不出＝null（调用方沿用上一张） */
export function spriteOf(pack: Pack, look: Look, wear: string, prev: StageImage | null = null): StageImage | null {
  return pickImage(
    pack,
    '立绘',
    [
      { value: CHAR_NAME, key: '谁', must: true },
      { value: look.act, key: '动作' },
      { value: wear, key: '穿着' },
      { value: look.expr, key: '表情' },
    ],
    { seed: look.seed, prev },
  )
}

/** 背景：地点 + 时段（这个地点有分时段的图才用得上，没有就是那一张）；配图库里没有这个地点＝'' */
export function bgOf(pack: Pack, place: string, time = ''): string {
  return pickImage(pack, '背景', [{ value: place, key: '地点', must: true }, { value: periodOf(time), key: '时段' }])?.src ?? ''
}

/** 大地图 */
export const mapOf = (pack: Pack) => pickImage(pack, '地图', [])?.src ?? ''

/** 场景区的时间（「周五 19:15」）→ 白天 / 晚上；没写钟点就原样交给配图库去认（「傍晚」「深夜」也认得） */
export function periodOf(time: string): string {
  const m = time.match(/(\d{1,2})[:：]\d{2}/)
  if (!m) return time
  const h = Number(m[1])
  return h >= 6 && h < 18 ? '白天' : '晚上'
}

/** 全部立绘的地址（空闲时预拉，换表情不用等下载） */
export const allSprites = (pack: Pack) => (pack.image_pack?.images ?? []).filter((im) => imageTags(im, '立绘')).map((im) => im.src)

/** 对话框配色：跟着这一句的表情（只管颜色，不影响挑图；认不出＝平常） */
export type Tone = 'normal' | 'happy' | 'shy' | 'pout' | 'surprised' | 'sad' | 'wink' | 'love'
const TONES: [RegExp, Tone][] = [
  [/委屈|难过|伤心|哭|不开心/, 'sad'],
  [/心动|喜欢|爱/, 'love'],
  [/害羞|羞|脸红/, 'shy'],
  [/生气|气|鼓腮|吃醋/, 'pout'],
  [/惊讶|惊|吓|愣/, 'surprised'],
  [/调皮|眨眼|吐舌|坏笑/, 'wink'],
  [/开心|笑|高兴|兴奋/, 'happy'],
]
export const toneOf = (expr: string): Tone => TONES.find(([re]) => re.test(expr))?.[1] ?? 'normal'
