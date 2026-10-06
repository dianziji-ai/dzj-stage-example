import { useMemo } from 'react'
import { pickZone, turnProgress, zoneData, zoneList, zoneText, type StageZone, type TurnProgress, type ZoneOptions } from '..'
import { shallowEqual } from './shallowEqual'
import { useStage } from './useStage'

/**
 * 按分区订阅：AI 一个字一个字写的时候，只有用到「正在变的那个区」的组件更新。
 *
 *   const body  = useZone('narrative')                              // 正文：跟着流一个字一个字变；新一轮开始是 undefined
 *   const face  = useZone('face', { hold: true, complete: true })   // 表情：写完才换；这一轮还没写到用上一次的
 *   const scene = useZone('scene', { hold: true, complete: true })  // 场景：同上（写到一半不闪半截地名）
 *
 * hold：这一轮还没写到这个区时，用最近一次写过的值（表情、场景、状态这类该一直有的区）。
 * complete：写完（出现结束标签）才算数，写到一半的半截值不给（数据区用它）。正文不要加，它就该一个字一个字出。
 * ★返回稳定引用：区的内容没变就是同一个对象，用它的组件不重渲染。
 */
export function useZone(id: string, opts: ZoneOptions = {}): StageZone | undefined {
  const { hold = false, complete = false } = opts
  return useStage((s) => pickZone(s, id, { hold, complete }))
}

/** AI 正在写哪个区（按卡里分区的顺序判断）；没在生成＝null。做「正在想心事…」「准备选项中…」这类提示 */
export function useWritingZone(): string | null {
  return useStage((s) => s.writing)
}

/** 数据区（yaml）里的一行文字；不给 key＝正文这类文字区的原文。没有＝'' */
export function useZoneText(id: string, key?: string, opts?: ZoneOptions): string {
  const z = useZone(id, opts)
  return useMemo(() => (z ? zoneText({ [id]: z }, id, key) : ''), [z, id, key])
}

/** 数据区整块（{ 地点: 'home', … }）；没有＝{}（同一个空对象，不会让组件白重渲染） */
export function useZoneData(id: string, opts?: ZoneOptions): Record<string, unknown> {
  const z = useZone(id, opts)
  return useMemo(() => (z ? zoneData({ [id]: z }, id) : EMPTY), [z, id])
}

/** 选项区的每一条；没有＝[] */
export function useZoneList(id: string, opts?: ZoneOptions): string[] {
  const z = useZone(id, opts)
  return useMemo(() => (z ? zoneList({ [id]: z }, id) : NONE), [z, id])
}

/** 这一轮写到哪儿了：正在写哪个区、进度 0–1（按区在卡里的位置）；没在生成＝null（换区 / 区写完时才变，不是每个字都变） */
export function useTurnProgress(): TurnProgress | null {
  return useStage((s) => turnProgress(s, s.snap.slots ?? []), shallowEqual)
}

const EMPTY: Record<string, unknown> = Object.freeze({}) as Record<string, unknown>
const NONE: string[] = Object.freeze([]) as unknown as string[]
