/**
 * @dianziji/stage/react —— React 层：启动外壳 + 一个 hook 拿全部。
 *
 *   <StageBoot stage={stage} preload={(snap) => [背景图]} onTurn={settle}>
 *     <App />            // App 里 useStage() 拿这一局的全部（一定有值）
 *   </StageBoot>
 *
 *   const { history, live, busy, error, save, send, retry, loadOlder, setSave } = useStage<MySave>()
 *   const face = useZone('face', { hold: true, complete: true })   // 按分区订阅：只有这个区变了才更新
 *
 * 提示：<StageToaster /> 把 SDK 的结果（读取 / 存档失败、面板改了存档…）自动弹成顶部提示；自己也能 toast('…')。
 * 存档：会话自带存档器；<SaveIndicator /> 显示「正在保存… / 已保存」，也是手动保存按钮。（在 StageBoot 里面都不用传参数）
 * 教程：docs/sdk-react.md
 */
export { default as StageBoot } from './StageBoot'
export { default as Splash } from './Splash'
export { useSession, useStage, useStageActions, type StageActions, type StageApi } from './useStage'
export { shallowEqual } from './shallowEqual'
export { useTurnProgress, useWritingZone, useZone, useZoneData, useZoneList, useZoneText } from './useZone'
export { default as TurnProgress } from './TurnProgress'
export { preloadImages } from './preload'
export { default as SaveIndicator } from './SaveIndicator'
export { useSaveStatus } from './useSaveStatus'
export { default as StageToaster } from './StageToaster'
export { dismissToast, toast, type Toast, type ToastKind } from './toast'
export { TAP_VIDEO_ATTRS, useTapVideo } from './useTapVideo'
export { useTurnCursor, type TurnCursor } from './useTurnCursor'
