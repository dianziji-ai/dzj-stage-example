/**
 * 舞台桥的消息格式：网站页面和舞台 iframe 之间只靠 postMessage 说话，一共 5 种消息。
 *
 *   舞台 → 网站：ready（我加载好了）· request（请你做件事）
 *   网站 → 舞台：init（整份快照）· update（快照里变了的那几项）· response（回 request）
 *
 * 网站一侧照这份写（平台前端 StageBridgeFrame）。完整说明：docs/bridge.md。
 */
import type { StageErrorCode, StageSnapshot } from './types'

/** 协议版本：两边不一样就不通（网站回 error.code＝version） */
export const PROTOCOL = 1

/**
 * 网站能替舞台打开的工具：
 *   model 换模型 / 调参数 · mod 挂 MOD · session 本局（设定、存档、图册、消费记录）· memory 记忆 · chat 切到对话模式（改 / 删 / 回溯记录在那里做）
 */
export type StageTool = 'model' | 'mod' | 'session' | 'memory' | 'chat'
export const STAGE_TOOLS: readonly StageTool[] = ['model', 'mod', 'session', 'memory', 'chat']

/** 舞台能请网站做的事（speak＝0.4.0 角色配音） */
export type StageMethod = 'send' | 'stop' | 'regenerate' | 'older' | 'save' | 'gallery' | 'open' | 'speak'

type Envelope<T extends string, D> = { dzj: 'stage'; v: typeof PROTOCOL; type: T } & D

export type ReadyMessage = Envelope<'ready', { sdk: string }>
export type RequestMessage = Envelope<'request', { id: string; method: StageMethod; args?: unknown }>
export type InitMessage = Envelope<'init', { snapshot: StageSnapshot }>
export type UpdateMessage = Envelope<'update', { patch: Partial<StageSnapshot> }>
export type ResponseMessage = Envelope<
  'response',
  { id: string; ok: true; data?: unknown } | { id: string; ok: false; error: { code: StageErrorCode; message: string; retryAfter?: number } }
>

/** 舞台发给网站的 */
export type ToSite = ReadyMessage | RequestMessage
/** 网站发给舞台的 */
export type ToStage = InitMessage | UpdateMessage | ResponseMessage

/** 是不是桥上的消息（别的 postMessage 一律不理） */
export function isBridgeMessage(d: unknown): d is { dzj: 'stage'; v: number; type: string } {
  return !!d && typeof d === 'object' && (d as { dzj?: unknown }).dzj === 'stage' && typeof (d as { type?: unknown }).type === 'string'
}
