/**
 * 一轮 → 一句一句（对话框「点一下下一句」就按这个走）。纯函数，单测在 beats.test.ts。
 *
 * ★剧本式正文（2026-10-10 起，卡里的约定见 docs/script-narrative.md）：正文区 narrative 是一个 YAML 列表，
 *   旁白和台词按真实发生的先后排在一起，一条一句：
 *       - 谁: '旁白'    说: '她跑到窗边……'
 *       - 谁: '电子姬'  表情: '害羞'  动作: '揪着衣角'  说: '才、才没有呢'
 *       - 谁: '我'      动作 / 说（只照抄玩家原话）
 *       - 谁: '消息'    来自: '💻 电子姬 App'  说: '今晚有流星雨哦'   ← 屏幕消息 / 纸条
 *   以前是「旁白区（markdown 散文）讲完整轮、再播对话区（talk）」——换场时时间线会倒回去。
 * 老消息（旁白区散文 + 对话区列表）照旧走 parseBeats：两种都从这一轮的原文里读（turnBeats），不依赖卡上现在开着哪个区。
 *   老格式旁白里可穿插 `> **💻 电子姬 App**`（首行粗体＝来源）屏幕消息、`---` 转场（不成句）。
 * 心声区 thought 不进对话框，整轮飘在立绘旁（useThought）。
 *
 * 她的每一句自带「样子」（表情 + 小动作的原文）→ 立绘一句一换。这里不认词：拿原文去配图库挑图（art.ts 的 spriteOf）。
 */
import { stripImages } from '@dianziji/stage'
import type { Look } from './art'
import { CHAR_NAME } from './content'

export type Beat =
  /** 你说的（「我」的条目；老格式对话区里没有「我」时用你发出去的那句） */
  | { kind: 'you'; text: string }
  /** 旁白一段 */
  | { kind: 'narr'; text: string }
  /** 屏幕消息 / 纸条：source＝首行粗体写的来源 */
  | { kind: 'note'; source: string; text: string }
  /** 电子姬的一句：say＝有没有说出口（只有动作也成一句）；look＝这句的样子（挑立绘用） */
  | { kind: 'her'; text: string; say: boolean; look: Look }

const HR = /^(?:-{3,}|\*{3,}|_{3,})$/
const SOURCE = /^\*\*([^*]+)\*\*\s*(.*)$/

/** 列表里的一条（SDK / scriptRows 解析好的对象；值可能是数字、null、带「」） */
type TalkRow = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').trim()
/** 模型偶尔自己加了「」：去掉一层，显示时统一由这里加 */
const unquote = (t: string) => t.replace(/^「([\s\S]*)」$/, '$1').trim()
/** 一句的显示文字：（小动作）「台词」 */
const line = (act: string, say: string) => (act ? `（${act.replace(/^（|）$/g, '')}）` : '') + (say ? `「${say}」` : '')
/** 玩家发出去的话里，舞台附的状态块不显示（<dj_state> 由 SDK 的 withState 拼上，平台给 AI 看） */
const cleanSaid = (said: string) => said.replace(/<dj_state>[\s\S]*?<\/dj_state>/g, '').trim()

/**
 * 拆一轮（老格式）。narrative＝旁白区原文；talk＝对话区的值（SDK 解析好的数组）；said＝这一轮你发出去的那句（对话区里没有「我」时补在最前面）。
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

// ───────────── 剧本式正文 + 从原文读 ─────────────

/**
 * 原文里的一个分区：text＝块里的字；done＝写完了（最后一块有收尾标签）。没有这个区＝null。
 * ★模型偶尔把同一个区分几段写（正文 → 别的区 → 正文）：和平台一样，几段按顺序拼起来
 */
export function zoneBlock(content: string, id: string): { text: string; done: boolean } | null {
  const parts: string[] = []
  let at = 0
  let done = true
  for (;;) {
    const open = content.indexOf(`<${id}>`, at)
    if (open < 0) break
    const from = open + id.length + 2
    const close = content.indexOf(`</${id}>`, from)
    if (close < 0) {
      parts.push(content.slice(from))
      done = false
      break
    }
    parts.push(content.slice(from, close))
    at = close + id.length + 3
  }
  return parts.length ? { text: parts.join('\n'), done } : null
}

/** 正文是不是剧本式列表（有「- 谁:」开头的行） */
export function isScript(text: string): boolean {
  return /^\s*-\s*谁\s*[:：]/m.test(text)
}

const ROW_START = /^\s*-\s+([^:：\s][^:：]*?)\s*[:：]\s?(.*)$/
const ROW_KEY = /^\s+([^:：\s-][^:：]*?)\s*[:：]\s?(.*)$/
const unyaml = (v: string) => {
  const t = v.trim()
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'")
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).replace(/\\"/g, '"')
  return t
}

/**
 * 容错地把列表拆成一条一条（不用严格 YAML：模型偶尔同一条写两次同一个键、缩进歪、漏引号，严格解析整区失败就一句都没有）：
 *  · 「- 键: 值」开一条，后面缩进的「键: 值」归这一条；同一个键写了两次，以后写的为准
 *  · 认不出的行接到上一个值后面（值被换行打断时不丢字）
 *  · done=false（还在生成）：最后一条可能没写完，不要
 */
export function scriptRows(text: string, done = true): Record<string, string>[] {
  const rows: Record<string, string>[] = []
  let cur: Record<string, string> | null = null
  let lastKey = ''
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue
    const start = raw.match(ROW_START)
    if (start) {
      cur = { [start[1].trim()]: unyaml(start[2]) }
      lastKey = start[1].trim()
      rows.push(cur)
      continue
    }
    const kv = cur && raw.match(ROW_KEY)
    if (cur && kv) {
      lastKey = kv[1].trim()
      cur[lastKey] = unyaml(kv[2])
      continue
    }
    if (cur && lastKey) cur[lastKey] = unyaml(`${cur[lastKey]}${raw.trim()}`)
  }
  return done ? rows : rows.slice(0, -1)
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

/**
 * 一轮原文 → 一句一句（两种格式都认）。streaming＝还在生成：只给写完的句子（剧本式：写完的条目；老格式：写完的旁白段 / 对话条目）。
 * said＝这一轮之前你说的那句（只有老格式用：对话区里一条「我」都没有时补在最前面）。
 * ★旁白不出图：AI 万一在旁白里写了 ![](编号) 也去掉（回忆 CG 只走 cg 区 → 全屏弹出）。
 */
export function turnBeats(content: string, said = '', streaming = false): Beat[] {
  const narr = zoneBlock(content, 'narrative')
  if (narr && isScript(narr.text)) return scriptBeats(scriptRows(narr.text, narr.done || !streaming))
  const prose = stripImages(narr?.text ?? '').trim()
  if (streaming && narr && !narr.done) return parseBeats(prose.slice(0, prose.lastIndexOf('\n') + 1)).slice(0, -1)
  const talk = zoneBlock(content, 'talk')
  return parseBeats(prose, talk ? scriptRows(talk.text, talk.done || !streaming) : null, streaming ? '' : said)
}

/** 同一轮里句子只增不减：这一截算出来的比已经显示的少（解析抖了一下），就保持已经显示的 */
export function keepGrowing(next: Beat[], shown: Beat[]): Beat[] {
  return next.length >= shown.length ? next : shown
}
