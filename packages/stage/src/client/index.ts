/**
 * @dianziji/stage/client —— 舞台客户端：和外层网站之间的桥（postMessage），零依赖、不碰界面、不依赖任何框架。
 *
 *   const stage = createStage()
 *   const snap  = await stage.ready()                      // 等网站给这一局的快照
 *   stage.subscribe((snap, changed) => …)                  // 网站推来的变化（流式、写完、回溯…）
 *   await stage.send('我推开门')                            // 发一句话（网站负责生成、计费）
 *   await stage.save({ hp: 80 })                           // 存档
 *   stage.open('model')                                    // 打开网站的换模型面板
 *
 * 只想自己管状态（Vue / 原生 JS / 别的框架）就只用这一层；
 * 会话引擎（乐观发送、重试、分区跟踪、存档器）在 @dianziji/stage，React 外壳在 @dianziji/stage/react。
 */
export * from './types'
export { createStage, STAGE_TOOLS, StageError, type SaveSource, type SnapshotListener, type StageClient, type StageEvent, type StageOp, type StageTool } from './stage'
export { PROTOCOL, isBridgeMessage, type StageMethod, type ToSite, type ToStage } from './protocol'
export { splitState, withState } from './state'
