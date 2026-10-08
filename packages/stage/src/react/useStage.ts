import { useContext, useMemo } from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import type { Session, SessionState, StageSave } from '..'
import { SessionCtx } from './context'

/** useStage() 拿到的东西：这一局的状态 + 能做的事 */
export type StageApi<S> = SessionState<S> &
  Pick<Session<S>, 'send' | 'stop' | 'regenerate' | 'retry' | 'dismissError' | 'loadOlder' | 'viewTurn' | 'prevTurn' | 'nextTurn' | 'setSave' | 'saveNow' | 'readZones' | 'stage' | 'saver'>

/** 拿 StageBoot 建好的会话本体（一般用 useStage；要在 React 外面调方法时才用它） */
export function useSession<S = StageSave>(): Session<S> {
  const s = useContext(SessionCtx)
  if (!s) throw new Error('useStage / useSession 要在 <StageBoot> 里面用')
  return s as Session<S>
}

/** useStageActions() 拿到的：只有方法（引用永远不变，用它的组件不会因为状态变化重渲染） */
export type StageActions<S> = Pick<Session<S>, 'send' | 'stop' | 'regenerate' | 'retry' | 'dismissError' | 'loadOlder' | 'viewTurn' | 'prevTurn' | 'nextTurn' | 'setSave' | 'saveNow' | 'readZones' | 'stage' | 'saver'>

/**
 * 舞台的状态。两种用法：
 *
 *   const g = useStage<MySave>()                                 // 全部：状态 + 方法（任何状态变了都重渲染）
 *   const save = useStage((s: SessionState<MySave>) => s.save)   // ★只订阅要的那部分：AI 一个字一个字写的时候，
 *   const busy = useStage((s) => s.busy)                         //   只有选出来的值变了才重渲染（顶栏、按钮这类用它）
 *   const { love, coins } = useStage((s) => ({ love: s.save.love, coins: s.save.coins }), shallowEqual)  // 一次取几个
 *
 * 只要方法（发送按钮之类）用 useStageActions()，永远不因状态重渲染。
 * 选择器缓存用 React 官方的 useSyncExternalStoreWithSelector（Redux / Zustand 同款）。
 */
export function useStage<S = StageSave>(): StageApi<S>
export function useStage<S = StageSave, R = unknown>(selector: (state: SessionState<S>) => R, isEqual?: (a: R, b: R) => boolean): R
export function useStage<S = StageSave, R = unknown>(selector?: (state: SessionState<S>) => R, isEqual?: (a: R, b: R) => boolean): StageApi<S> | R {
  const s = useSession<S>()
  const state = useSyncExternalStoreWithSelector(s.subscribe, s.getState, s.getState, selector ?? identity<S>, isEqual as ((a: unknown, b: unknown) => boolean) | undefined)
  const actions = useStageActions<S>()
  const all = useMemo(() => ({ ...(state as SessionState<S>), ...actions }), [state, actions])
  return selector ? (state as R) : all
}

function identity<S>(st: SessionState<S>): SessionState<S> {
  return st
}

/** 只要方法（send / setSave / retry…）：引用不变，用它的组件不会因为状态变化重渲染 */
export function useStageActions<S = StageSave>(): StageActions<S> {
  const s = useSession<S>()
  return useMemo(() => ({ send: s.send, stop: s.stop, regenerate: s.regenerate, retry: s.retry, dismissError: s.dismissError, loadOlder: s.loadOlder, viewTurn: s.viewTurn, prevTurn: s.prevTurn, nextTurn: s.nextTurn, setSave: s.setSave, saveNow: s.saveNow, readZones: s.readZones, stage: s.stage, saver: s.saver }), [s])
}
