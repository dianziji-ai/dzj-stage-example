/**
 * 一轮 → 一句一句（对话框「点一下下一句」就按这个走）。纯函数，单测在 beats.test.ts。
 *
 * ★剧本式正文（卡里的约定见 docs/script-narrative.md）：正文区 narrative 是一个 YAML 列表，
 *   旁白和台词按真实发生的先后排在一起，一条一句：
 *       - 谁: '旁白'    说: '她跑到窗边……'
 *       - 谁: '电子姬'  表情: '害羞'  动作: '揪着衣角'  说: '才、才没有呢'
 *       - 谁: '我'      动作 / 说（只照抄玩家原话）
 *       - 谁: '消息'    来自: '💻 电子姬 App'  说: '今晚有流星雨哦'   ← 屏幕消息 / 纸条
 * ★不自己解析原文：列表由 SDK 拆好（和网站聊天页同一套解析，useZoneRows / zoneRows），这里只把每一条变成一句。
 * 心声区 thought 不进对话框，整轮飘在立绘旁（useThought）。
 *
 * 她的每一句自带「样子」（表情 + 小动作的原文）→ 立绘一句一换。这里不认词：拿原文去配图库挑图（art.ts 的 spriteOf）。
 */
import type { Look } from './art'
import { CHAR_NAME } from './content'

export type Beat =
  /** 你说的（「我」的条目） */
  | { kind: 'you'; text: string }
  /** 旁白一段 */
  | { kind: 'narr'; text: string }
  /** 屏幕消息 / 纸条：source＝「来自」写的来源 */
  | { kind: 'note'; source: string; text: string }
  /** 电子姬的一句：say＝有没有说出口（只有动作也成一句）；look＝这句的样子（挑立绘用） */
  | { kind: 'her'; text: string; say: boolean; look: Look }

/** 列表里的一条（SDK 解析好的对象；值可能是数字、null、带「」） */
type TalkRow = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').trim()
/** 模型偶尔自己加了「」：去掉一层，显示时统一由这里加 */
const unquote = (t: string) => t.replace(/^「([\s\S]*)」$/, '$1').trim()
/** 一句的显示文字：（小动作）「台词」 */
const line = (act: string, say: string) => (act ? `（${act.replace(/^（|）$/g, '')}）` : '') + (say ? `「${say}」` : '')

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

/** 剧本式的一列 → 一句一句（顺序就是 AI 写的顺序）。★玩家原话不补进来：等待期间对话框自己显示（Dialogue 的 waiting） */
export function scriptBeats(rows: TalkRow[]): Beat[] {
  const out: Beat[] = []
  for (const r of rows) {
    const who = str(r['谁'])
    const act = str(r['动作'])
    const say = unquote(str(r['说']))
    if (who === '旁白') {
      if (say && !say.startsWith('💭')) out.push({ kind: 'narr', text: say })
    } else if (who === '消息') {
      if (say) out.push({ kind: 'note', source: str(r['来自']), text: say })
    } else if (!act && !say) {
      continue
    } else if (who && who !== CHAR_NAME) {
      out.push({ kind: 'you', text: line(act, say) })
    } else {
      out.push({ kind: 'her', text: line(act, say), say: !!say, look: { expr: str(r['表情']), act, seed: line(act, say) } })
    }
  }
  return out
}
