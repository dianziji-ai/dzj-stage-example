/**
 * 分区：把 AI 回复的原文拆成一块一块，舞台按块渲染（正文进对话框、状态进状态栏、选项变按钮…）。
 * 解析逻辑和网站聊天页是同一套（zones.gen.js 由平台源码生成）。
 * ★配图编号 ![](17) 原样留在分区里，不换成地址：要不要显示、怎么显示由舞台决定（helper 见 images.ts）。
 *
 *   const z = readZones(text, snap)
 *   z['正文']   → { type: 'narrative', value: '原文 markdown' }
 *   z['状态']   → { type: 'data',      value: { 好感: 30, … } }   YAML 已解析成对象
 *   z['选项']   → { type: 'action',    value: ['敲门', '离开', …] }
 *   z.main      → 没写进任何分区的散文（兜底）
 */
import type { StageSnapshot } from '../client'
import { composeZones, type Zone } from './zones.gen.js'

export type { Zone }

export type StageZone =
  | { label: string; type: 'narrative'; value: string }
  | { label: string; type: 'data'; value: unknown }
  | { label: string; type: 'action'; value: string[] }
  | { label: string; type: 'reasoning'; value: string }

export type StageZones = Record<string, StageZone>

/** 原文 → 分区。流式时每来一段就可以调一次（解析容错半截标签）。 */
export function readZones(text: string, snap: Pick<StageSnapshot, 'slots'>, reasoning?: string): StageZones {
  const out = composeZones(snap.slots, text, { reasoning, imagePack: null }) // 不传配图库＝编号原样保留
  const zones: StageZones = {}
  for (const [k, v] of Object.entries(out)) if (v) zones[k] = v as StageZone
  return zones
}

/*
 * 安全取值：AI 不一定每轮都写每个区、每一行（也可能写错格式），直接 zones.status.value.好感变化 一漏写就崩。
 * 用这几个取：没写 / 格式不对一律给安全的默认值，游戏规则里不用到处写 ?. 和兜底。
 *
 *   zoneNum(zones, 'status', '好感变化')   → 3；没写 / 不是数字 → null
 *   zoneText(zones, 'thought', '心声')     → '今天也想…'；没写 → ''（不给 key：取正文这类 markdown 区的原文）
 *   zoneList(zones, 'action')              → ['敲门', '离开']；没写 → []
 *   zoneData(zones, 'scene')               → { 地点: 'home', … }；没写 / 不是数据区 → {}
 */

/** 数据区（yaml）整块：没写 / 不是数据区 → {} */
export function zoneData(zones: StageZones, zone: string): Record<string, unknown> {
  const z = zones[zone]
  return z?.type === 'data' && z.value && typeof z.value === 'object' && !Array.isArray(z.value) ? (z.value as Record<string, unknown>) : {}
}

/** 数据区里的一个数字（「+3」「3」「-2」都认）：没写 / 不是数字 → null */
export function zoneNum(zones: StageZones, zone: string, key: string): number | null {
  const v = zoneData(zones, zone)[key]
  if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) return null
  const n = Number(typeof v === 'string' ? v.trim() : v)
  return Number.isFinite(n) ? n : null
}

/** 数据区里的一行文字（去掉首尾空白）；不给 key＝正文这类文字区的原文。没写 → '' */
export function zoneText(zones: StageZones, zone: string, key?: string): string {
  if (key === undefined) {
    const z = zones[zone]
    return z && (z.type === 'narrative' || z.type === 'reasoning') ? z.value : ''
  }
  const v = zoneData(zones, zone)[key]
  return typeof v === 'string' ? v.trim() : typeof v === 'number' || typeof v === 'boolean' ? String(v) : ''
}

/** 选项区的每一条（去掉空的）：没写 → [] */
export function zoneList(zones: StageZones, zone: string): string[] {
  const z = zones[zone]
  return z?.type === 'action' ? z.value.map((s) => s.trim()).filter(Boolean) : []
}
