/**
 * @dianziji/stage/client —— 舞台 API 客户端（零依赖、不碰界面、不依赖任何框架）。
 *
 *   const stage = createStage({ api, token })
 *   const snap  = await stage.load()                       // 读这一局
 *   const turn  = await stage.send('我推开门', handlers)     // 发一句话 + 收流
 *   await stage.save({ hp: 80 })                           // 存档
 *
 * 只想自己管状态（Vue / 原生 JS / 别的框架）就只用这一层；
 * 会话引擎（乐观发送、重试、分区跟踪、存档器）在 @dianziji/stage，React 外壳在 @dianziji/stage/react。
 */
export * from './types'
export { createStage, StageError, type SaveSource, type StageClient, type StageEvent, type StageOp, type Turn } from './stage'
export { splitState, withState } from './state'
export { decodeToken, type TokenInfo } from './token'
export { readLaunch, type Launch } from './launch'
