import { aiTurns, saidBefore, type SessionState } from '..'
import { shallowEqual } from './shallowEqual'
import { useStage, useStageActions } from './useStage'

/** useTurnCursor() 拿到的：回看到哪一轮 + 翻页 */
export type TurnCursor = {
  /** 正在回看（不是最新那一轮） */
  viewing: boolean
  /** 往前第几轮：0＝最新，1＝上一轮… */
  back: number
  /** 还能往前翻（含「已加载的最早一轮之前还有更早的历史」） */
  canPrev: boolean
  /** 还能往后翻（＝正在回看） */
  canNext: boolean
  /** 回看的那一轮，玩家说的那句（开场＝''；看最新时＝''） */
  said: string
  /** 正在回看的那条 AI 回复的 id（看最新＝null）：给打字机之类当 key，换一轮就重新挂载、直接显示全文 */
  id: number | null
  prev: () => Promise<boolean>
  next: () => boolean
  /** 回到最新 */
  latest: () => void
}

/**
 * 上一轮 / 下一轮：回看之前 AI 写的每一轮。
 *
 *   const c = useTurnCursor()
 *   <button disabled={!c.canPrev} onClick={() => void c.prev()}>‹</button>
 *   {c.viewing && <button onClick={c.latest}>回到最新</button>}
 *   <button disabled={!c.canNext} onClick={c.next}>›</button>
 *
 * 回看时 useZone / useZoneText / useZoneData… 拿到的都是那一轮的分区（场景、立绘、正文、状态…全部跟着倒回），组件不用改。
 * ★只是看：存档（save）不倒回，不结算；生成中不能翻；玩家一发话自动回到最新。选项这类「能点的」回看时自己置灰。
 * ★性能：只在翻页 / 历史变了时重渲染，AI 写字时不动。
 */
export function useTurnCursor(): TurnCursor {
  const st = useStage((s: SessionState<unknown>) => {
    const turns = aiTurns(s.history)
    const i = s.view === null ? turns.length - 1 : turns.findIndex((m) => m.id === s.view)
    return {
      viewing: s.view !== null,
      back: Math.max(0, turns.length - 1 - i),
      canPrev: !s.busy && (i > 0 || s.hasOlder),
      canNext: s.view !== null,
      said: s.view === null ? '' : saidBefore(s.history, s.view),
      id: s.view,
    }
  }, shallowEqual)
  const a = useStageActions()
  return { ...st, prev: a.prevTurn, next: a.nextTurn, latest: () => void a.viewTurn(null) }
}
