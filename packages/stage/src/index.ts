/**
 * @dianziji/stage —— 舞台 SDK。分三层，上层只依赖下层：
 *
 *   @dianziji/stage/client   客户端：createStage（读这一局 / 发一句话收流 / 存档 / 图册），零依赖
 *   @dianziji/stage          会话引擎：createSession（乐观发送、重试、分区跟踪）、存档器、分区解析、markdown
 *   @dianziji/stage/react    React 外壳：StageBoot、useStage、useZone、提示与存档指示
 *
 * 这个入口把客户端也一并导出，用会话引擎的舞台从这里引一处就够。教程：docs/sdk-*.md
 * ★只读：作者开发时不要改这个包（官方升级时整个替换）。文档：docs/sdk-*.md
 */
export * from './client'
export { createSaver, type SaveStatus, type Saver } from './session/saver'
export { aiTurns, createSession, saidBefore, type Session, type SessionOptions, type SessionState, type TurnResult } from './session/session'
export { readZones, zoneData, zoneList, zoneNum, zoneText, type StageZone, type StageZones } from './session/zones'
export { imageRefs, imageUrl, resolveImages, stripImages } from './session/images'
export { pickZone, turnProgress, writingZone, type TurnProgress, type ZoneOptions } from './session/zonetrack'
export { hideOpenMarks, renderMarkdown } from './view/markdown'
export { watchViewport } from './view/viewport'
