import type { StageMessage } from '../client'
import type { StageZone, StageZones } from './zones'

/*
 * 分区追踪（会话用，纯函数、可单测）：引擎知道 AI 现在写到哪个区、哪个区写完了、每个区最近一次写的是什么，
 * 界面就能按区订阅（useZone）——AI 写正文时，只有用到正文的组件更新，立绘 / 背景 / 顶栏一次都不重画。
 */

/** 一个区的「内容指纹」：类型 + 值。比较它就知道这个区变没变（比较字符串，几乎不花时间） */
export function zoneKey(z: StageZone | undefined): string {
  if (!z) return ''
  return `${z.type}:${typeof z.value === 'string' ? z.value : JSON.stringify(z.value)}`
}

/**
 * 稳定引用：新解析出来的区，内容和上一份一样就沿用上一份的对象。
 * 这样订阅某个区的组件只在那个区真的变了才拿到新对象、才重渲染。
 */
export function stabilize(next: StageZones, prev: StageZones): StageZones {
  const out: StageZones = {}
  for (const [id, z] of Object.entries(next)) out[id] = prev[id] && zoneKey(prev[id]) === zoneKey(z) ? prev[id] : z
  return out
}

/** 原文里这个区写完了没有（出现了结束标签 </区名>） */
export function isClosed(raw: string, id: string): boolean {
  return new RegExp(`<\\s*/\\s*${escape(id)}\\s*>`).test(raw)
}

/** 每个出现过的区写完了没有 */
export function closedOf(raw: string, zones: StageZones): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const id of Object.keys(zones)) out[id] = isClosed(raw, id)
  return out
}

/**
 * AI 正在写哪个区：最后一个打开、还没关上的 <区>；刚关上一个、下一个还没开：按卡里分区的顺序算「下一个」。
 * 正文里别的尖括号（<b>）不算，只认卡里注册过的区。没开始写 / 全写完＝null。
 */
export function writingZone(raw: string, ids: string[]): string | null {
  let open: string | null = null
  for (const m of raw.matchAll(/<\s*(\/?)\s*([A-Za-z0-9_一-鿿-]+)\s*>/g)) {
    if (!ids.includes(m[2])) continue
    if (m[1]) {
      if (open === m[2]) open = null
    } else open = m[2]
  }
  if (open) return open
  const last = [...raw.matchAll(/<\s*\/\s*([A-Za-z0-9_一-鿿-]+)\s*>/g)].map((m) => m[1]).filter((z) => ids.includes(z)).pop()
  if (!last) return null
  return ids[ids.indexOf(last) + 1] ?? null
}

/**
 * 每个区「最近一次写过的值」：从最新的 AI 回复往前找，每个区取最近写过它的那条。
 * 断流的半截（status: error）不算；开场也算（开场写的表情、地点就是开局的样子）。
 */
export function latestZones(history: StageMessage[], read: (raw: string) => StageZones, prev: StageZones = {}): StageZones {
  const out: StageZones = {}
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i]
    if (m.role !== 'assistant' || !m.content.trim() || m.status === 'error') continue
    for (const [id, z] of Object.entries(read(m.content))) if (!(id in out)) out[id] = z
  }
  return stabilize(out, prev)
}

/** 最后一条写完的 AI 回复（断流的半截不算）；没有＝'' */
export function lastAiText(history: StageMessage[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i]
    if (m.role === 'assistant' && m.content.trim() && m.status !== 'error') return m.content
  }
  return ''
}

/** useZone 的取法 */
export type ZoneOptions = {
  /** 这一轮还没写到这个区：用最近一次写过的值（表情、场景、状态这类该一直有的区用它） */
  hold?: boolean
  /** 这个区写完（出现结束标签）才算数：写到一半的半截值不给（场景、表情这类数据区用它，避免闪半截） */
  complete?: boolean
}

/**
 * 按取法从会话状态里拿一个区（纯函数，useZone 就是用它）：
 *  · 这一轮写了、而且（不要求写完 / 不在生成 / 已经写完）→ 这一轮的
 *  · 否则 hold → 最近一次写过的；不 hold → undefined（比如新一轮刚开始，正文还没来）
 * 返回的是稳定引用：区的内容没变，拿到的就是同一个对象。
 */
export function pickZone(s: { zones: StageZones; held: StageZones; closed: Record<string, boolean>; busy: boolean }, id: string, o: ZoneOptions = {}): StageZone | undefined {
  const cur = s.zones[id]
  if (cur && (!o.complete || !s.busy || s.closed[id])) return cur
  return o.hold ? s.held[id] : undefined
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 这一轮写到哪儿了（进度条 / 「正在写 · 表情」用） */
export type TurnProgress = {
  /** 正在写的区；还没开始写＝null */
  zone: string | null
  /** 正在写的区的名字（卡里分区的 label，没有就用区 id）；还没开始写＝'' */
  label: string
  /** 0–1：正在写的区在卡里排第几（只看 AI 写到哪儿了，不数写完了几个——AI 跳过的区不会让进度卡住） */
  ratio: number
}

/**
 * 这一轮写到哪儿了。没在生成＝null。
 * ★只看位置不数数：进度＝正在写的区在卡里的位置（这个区写到一半算半格）。AI 跳过几个区就直接往前跳；
 *   AI 一写完（流结束）这一轮就结束了，进度条收起——不管后面还有几个区没写。
 */
export function turnProgress(s: { busy: boolean; closed: Record<string, boolean>; writing: string | null }, slots: { zone: string; label?: string; enabled?: boolean }[]): TurnProgress | null {
  if (!s.busy) return null
  const live = slots.filter((sl) => sl.enabled !== false)
  const at = s.writing ? live.findIndex((sl) => sl.zone === s.writing) : -1
  if (at < 0) return { zone: null, label: '', ratio: 0 }
  const cur = live[at]
  return { zone: cur.zone, label: cur.label || cur.zone, ratio: Math.min(1, (at + (s.closed[cur.zone] ? 1 : 0.5)) / live.length) }
}
