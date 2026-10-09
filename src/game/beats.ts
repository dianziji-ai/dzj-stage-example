/**
 * 一轮 → 一句一句（对话框「点一下下一句」就按这个走）。纯函数，单测在 beats.test.ts。
 *
 * AI 每轮写两个区（卡里的约定，见 docs/example-card.md）：
 *   narrative 旁白区（markdown）：2～4 段旁白，可穿插
 *       > **💻 电子姬 App**        ← 首行粗体＝来源，合成一句「屏幕消息」
 *       ---                        ← 转场，不成句
 *   talk 对话区（YAML 列表）：一句一条
 *       - 谁: '电子姬'  表情: '害羞'  动作: '揪着衣角'  说: '才、才没有呢'
 *       - 谁: '我'      ……（只照抄玩家原话）
 *   thought 心声区（markdown）：一句她没说出口的话 ← 不进对话框，整轮飘在立绘旁（useThought）
 *
 * 播放顺序＝先旁白（把场景铺开），再对话（你和她一来一回）。
 * 她的每一句自带「样子」（表情 + 小动作的原文）→ 立绘一句一换。这里不认词：拿原文去配图库挑图（art.ts 的 spriteOf）。
 */
import type { Look } from './art'
import { CHAR_NAME } from './content'

export type Beat =
  /** 你说的（对话区「我」的条目；没有就用你发出去的那句） */
  | { kind: 'you'; text: string }
  /** 旁白一段 */
  | { kind: 'narr'; text: string }
  /** 屏幕消息 / 纸条：source＝首行粗体写的来源 */
  | { kind: 'note'; source: string; text: string }
  /** 电子姬的一句：say＝有没有说出口（只有动作也成一句）；look＝这句的样子（挑立绘用） */
  | { kind: 'her'; text: string; say: boolean; look: Look }

const HR = /^(?:-{3,}|\*{3,}|_{3,})$/
const SOURCE = /^\*\*([^*]+)\*\*\s*(.*)$/

/** 对话区一条（SDK 已把 YAML 解析成对象；值可能是数字、null、带「」） */
type TalkRow = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').trim()
/** 模型偶尔自己加了「」：去掉一层，显示时统一由这里加 */
const unquote = (t: string) => t.replace(/^「([\s\S]*)」$/, '$1').trim()
/** 一句的显示文字：（小动作）「台词」 */
const line = (act: string, say: string) => (act ? `（${act.replace(/^（|）$/g, '')}）` : '') + (say ? `「${say}」` : '')
/** 玩家发出去的话里，舞台附的状态块不显示（<dj_state> 由 SDK 的 withState 拼上，平台给 AI 看） */
const cleanSaid = (said: string) => said.replace(/<dj_state>[\s\S]*?<\/dj_state>/g, '').trim()

/**
 * 拆一轮。narrative＝旁白区原文；talk＝对话区的值（SDK 解析好的数组）；said＝这一轮你发出去的那句（对话区里没有「我」时补在最前面）。
 */
export function parseBeats(narrative: string, talk: unknown = null, said = ''): Beat[] {
  const out: Beat[] = []

  // ① 旁白：一行一句；连续的 > 引用行合成一块（有粗体来源的是屏幕消息；心声该写在心声区，模型万一写进旁白也跳过）
  let quote: string[] | null = null
  const flush = () => {
    const lines = (quote ?? []).filter(Boolean)
    quote = null
    if (!lines.length || lines[0].startsWith('💭')) return
    const m = lines[0].match(SOURCE)
    const text = (m ? [m[2], ...lines.slice(1)] : lines).filter(Boolean).join('\n')
    if (text) out.push({ kind: 'note', source: m ? m[1].trim() : '', text })
  }
  for (const raw of narrative.split('\n')) {
    const l = raw.trim()
    if (l.startsWith('>')) {
      ;(quote ??= []).push(l.replace(/^>\s?/, '').trim())
      continue
    }
    flush()
    if (l && !HR.test(l)) out.push({ kind: 'narr', text: l })
  }
  flush()

  // ② 对话：「谁」写了、又不是她＝你（模型偶尔写成玩家的名字）；没写「谁」的算她
  const rows = Array.isArray(talk) ? talk.filter((r): r is TalkRow => !!r && typeof r === 'object') : []
  let mine = 0
  for (const r of rows) {
    const who = str(r['谁'])
    const act = str(r['动作'])
    const say = unquote(str(r['说']))
    if (!act && !say) continue
    if (who && who !== CHAR_NAME) {
      out.push({ kind: 'you', text: line(act, say) })
      mine++
    } else {
      out.push({ kind: 'her', text: line(act, say), say: !!say, look: { expr: str(r['表情']), act, seed: line(act, say) } })
    }
  }

  // ③ 对话区里一条「我」都没有（模型没照抄）：把你发出去的那句放最前面，一轮从你开口开始
  const you = cleanSaid(said)
  if (you && !mine) out.unshift({ kind: 'you', text: you })
  return out
}

/**
 * 第 idx 句她是什么样子：
 *   这句是她说的 → 就是这句；
 *   往前找她最近一句 → 旁白、你说话的时候她还在画面里，立绘不消失、不乱跳；
 *   往前没有（一轮开头先是几句旁白）→ 往后找她第一句，提前换好；
 *   这一轮她一句都没说 → fallback（上一轮最后的样子）。
 */
export function lookAt(beats: Beat[], idx: number, fallback: Look): Look {
  const at = (j: number) => {
    const b = beats[j]
    return b?.kind === 'her' ? b.look : null
  }
  for (let j = Math.min(idx, beats.length - 1); j >= 0; j--) if (at(j)) return at(j)!
  for (let j = idx + 1; j < beats.length; j++) if (at(j)) return at(j)!
  return fallback
}

/** 这一轮她最后一句的样子（下一轮开头、她还没开口时立绘就停在这张）；她没说话＝null */
export function lastLook(beats: Beat[]): Look | null {
  for (let j = beats.length - 1; j >= 0; j--) {
    const b = beats[j]
    if (b.kind === 'her') return b.look
  }
  return null
}
