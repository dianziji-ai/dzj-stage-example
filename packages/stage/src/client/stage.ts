/**
 * 舞台客户端：和外层网站之间的桥（postMessage），零依赖、不碰界面。
 * 舞台不连后端、没有凭证：网站把这一局的快照推进来（init / update），舞台有事就请网站去做（request / response）。
 * 只用这一层（Vue / 原生 JS / 自己管状态）就从 @dianziji/stage/client 引。消息格式见 protocol.ts、docs/bridge.md。
 */
import { isBridgeMessage, PROTOCOL, STAGE_TOOLS, type StageMethod, type StageTool, type ToSite } from './protocol'
import type { StageErrorCode, StageGallery, StageSave, StageSnapshot } from './types'

declare const __SDK_VERSION__: string | undefined
/** 握手时报给网站的 SDK 版本（排查用） */
const SDK_VERSION = typeof __SDK_VERSION__ === 'string' ? __SDK_VERSION__ : '0.3.1'

/** 等网站的第一份快照最多等多久：超时＝不在网站里打开（比如直接打开了 localhost） */
const READY_MS = 3000
/** 握手消息隔多久重发一次（网站可能还没开始听） */
const HELLO_EVERY_MS = 400
/** 一个请求等网站回多久 */
const REQUEST_MS = 15_000

/** 这些错误可以原样再试一次（连接 / 上游 / 忙 / 太快 / 维护）；能量、参数类的再试也没用 */
const RETRYABLE = new Set(['network', 'stream', 'busy', 'rate_limited', 'maintenance', 'error'])

/** 出错统一抛这个：message 是给玩家看的中文，code 给程序判断 */
export class StageError extends Error {
  readonly code: StageErrorCode
  /** rate_limited 时要等的秒数 */
  readonly retryAfter?: number

  constructor(code: StageErrorCode, message: string, retryAfter?: number) {
    super(message)
    this.name = 'StageError'
    this.code = code
    this.retryAfter = retryAfter
  }

  /** 原样再试一次有没有意义 */
  get retryable(): boolean {
    return RETRYABLE.has(this.code)
  }
}

/**
 * 客户端上发生的事（stage.on 订阅）：存好了、失败了。
 * 游戏不用管存档是谁改的（自己存的 / 玩家在本局面板改的），订阅一次就能跟着更新；提示组件（StageToaster）也靠它弹提示。
 */
/** 哪个操作：请网站做的那几件（StageMethod），或 turn＝游戏规则 onTurn 结算 */
export type StageOp = StageMethod | 'turn'
/** 谁存的：saver＝存档器自动存、manual＝手动保存、panel＝玩家在本局面板改的、app＝直接调 stage.save */
export type SaveSource = 'saver' | 'manual' | 'panel' | 'app'
export type StageEvent =
  /** 存档存好了 */
  | { type: 'save'; state: StageSave | null; source: SaveSource }
  /** 某个操作失败了（error.message 是给玩家看的中文） */
  | { type: 'error'; op: StageOp; error: StageError }

/** 快照变了：snap＝最新整份，changed＝这次变了哪几项（init 时是全部） */
export type SnapshotListener = (snap: StageSnapshot, changed: readonly (keyof StageSnapshot)[]) => void

export type StageClient = {
  /** 等网站给第一份快照（StageBoot 用）。不在网站里打开 / 网站没回 → StageError('unauthorized') */
  ready: () => Promise<StageSnapshot>
  /** 现在的快照（本地镜像，不走网络）；还没连上＝null */
  snapshot: () => StageSnapshot | null
  /** 订阅快照变化（init、update 都会调）；返回取消订阅 */
  subscribe: (fn: SnapshotListener) => () => void
  /**
   * 发一句话。text 原样发出去（SDK 不往里加任何东西）；想让 AI 知道「此刻状态」就用 withState(话, 状态) 拼好再发。
   * 开始生成了就 resolve（网站已把「在生成」推过来，不等写完）；没发出去（能量不够这类）就 reject。之后的流式、写完、失败都看快照的 live / history / error。
   */
  send: (text: string) => Promise<void>
  /** 停止生成（已经写出来的字保留） */
  stop: () => Promise<void>
  /** 重新生成最后一条 AI 回复（消耗能量） */
  regenerate: () => Promise<void>
  /** 读更早的历史：读到的随快照的 history 推过来 */
  older: () => Promise<void>
  /**
   * 存档（整份覆盖，null 清空）。存好了广播 { type: 'save', state, source }。
   * opts.source：谁存的（默认 'app'）。一般交给存档器（createSaver）处理。
   */
  save: (state: StageSave | null, opts?: { source?: SaveSource }) => Promise<{ size: number }>
  /** 图册（和网站画廊同一套解锁规则；打开图册时再调） */
  gallery: () => Promise<StageGallery>
  /** 打开网站自己的工具（换模型、挂 MOD、本局、记忆、切到对话）。舞台不用自己做这些面板。没连上网站＝false */
  open: (tool: StageTool) => boolean
  /** 网站上的页面地址（比如 siteUrl('/recharge') 去充值）；连上之前只给路径本身 */
  siteUrl: (path: string) => string
  /** 订阅客户端上的事（存好了 / 失败了），返回取消订阅 */
  on: (fn: (e: StageEvent) => void) => () => void
  /** SDK 之外的代码（会话、组件）也走同一条失败广播（比如游戏规则 onTurn 出错），提示组件就能弹出来 */
  report: (op: StageOp, error: StageError) => void
  /** 不用了：摘掉监听、拒掉还没回的请求 */
  dispose: () => void
}

export type { StageTool } from './protocol'
export { STAGE_TOOLS } from './protocol'

/**
 * 建桥。一个舞台只建一个（官方例子放在 src/stage.ts）。
 * 参数只给测试用（换掉外层窗口 / 本窗口）；正常不用传。
 */
export function createStage(opts: { parent?: Window; self?: Window } = {}): StageClient {
  const self = opts.self ?? (typeof window !== 'undefined' ? window : undefined)
  const parent = opts.parent ?? (self && self.parent !== self ? self.parent : undefined)

  let snap: StageSnapshot | null = null
  let origin: string | null = null // 第一份 init 从哪来，之后只认它、只往它发
  let seq = 0
  const pending = new Map<string, { ok: (data: unknown) => void; fail: (e: StageError) => void; timer: ReturnType<typeof setTimeout> }>()
  const snapSubs = new Set<SnapshotListener>()
  const listeners = new Set<(e: StageEvent) => void>()
  let readyWait: { ok: (s: StageSnapshot) => void; fail: (e: StageError) => void }[] = []

  const emit = (e: StageEvent) =>
    listeners.forEach((f) => {
      try {
        f(e)
      } catch {
        /* 订阅方自己的错不影响别人 */
      }
    })
  const notify = (changed: readonly (keyof StageSnapshot)[]) =>
    snapSubs.forEach((f) => {
      try {
        f(snap!, changed)
      } catch (e) {
        console.error('[stage] 订阅快照的回调出错：', e)
      }
    })

  const post = (msg: ToSite) => parent?.postMessage(msg, origin ?? '*') // 连上之前只发 ready，里面没有任何数据

  const onMessage = (e: MessageEvent) => {
    if (!parent || e.source !== parent || !isBridgeMessage(e.data)) return
    if (origin && e.origin !== origin) return
    const d = e.data as { v: number; type: string; [k: string]: unknown }
    if (d.v !== PROTOCOL) {
      // 网站和舞台的桥不是同一版：说清楚，别让玩家干等 3 秒再看到「请在网站里打开」
      const err = new StageError('version', d.v > PROTOCOL ? '舞台版本太旧，请作者更新 SDK 后重新上传' : '网站版本太旧，刷新网页再试')
      console.error(`[stage] 网站的桥协议是 v${d.v}，这个舞台是 v${PROTOCOL}`)
      readyWait.forEach((w) => w.fail(err))
      readyWait = []
      return
    }
    if (d.type === 'init') {
      origin = e.origin
      snap = d.snapshot as StageSnapshot
      readyWait.forEach((w) => w.ok(snap!))
      readyWait = []
      notify(Object.keys(snap) as (keyof StageSnapshot)[])
    } else if (d.type === 'update' && snap) {
      const patch = (d.patch ?? {}) as Partial<StageSnapshot>
      const changed = Object.keys(patch) as (keyof StageSnapshot)[]
      if (!changed.length) return
      snap = { ...snap, ...patch }
      notify(changed)
    } else if (d.type === 'response') {
      const p = pending.get(d.id as string)
      if (!p) return
      pending.delete(d.id as string)
      clearTimeout(p.timer)
      if (d.ok) p.ok(d.data)
      else {
        const err = (d.error ?? {}) as { code?: StageErrorCode; message?: string; retryAfter?: number }
        p.fail(new StageError(err.code ?? 'error', err.message || '出了点问题', err.retryAfter))
      }
    }
  }
  self?.addEventListener('message', onMessage)

  /** 请网站做件事；失败广播一次再抛 */
  function request<T = unknown>(method: StageMethod, args?: unknown): Promise<T> {
    const fail = (error: StageError): never => {
      emit({ type: 'error', op: method, error })
      throw error
    }
    if (!parent || !snap) return Promise.reject(new StageError('unauthorized', '请在电子姬网站里打开这张卡')).catch(fail)
    const id = `r${++seq}`
    return new Promise<T>((ok, no) => {
      const timer = setTimeout(() => {
        pending.delete(id)
        no(new StageError('network', '网站没有回应，稍后再试'))
      }, REQUEST_MS)
      pending.set(id, { ok: ok as (d: unknown) => void, fail: no, timer })
      post({ dzj: 'stage', v: PROTOCOL, type: 'request', id, method, args })
    }).catch(fail)
  }

  return {
    ready() {
      if (snap) return Promise.resolve(snap)
      if (!parent) return Promise.reject(new StageError('unauthorized', '请在电子姬网站里打开这张卡'))
      return new Promise((ok, fail) => {
        readyWait.push({ ok, fail })
        const hello = () => post({ dzj: 'stage', v: PROTOCOL, type: 'ready', sdk: SDK_VERSION })
        hello()
        const every = setInterval(() => (snap ? clearInterval(every) : hello()), HELLO_EVERY_MS)
        setTimeout(() => {
          clearInterval(every)
          if (snap) return
          readyWait = readyWait.filter((w) => w.ok !== ok)
          fail(new StageError('unauthorized', '请在电子姬网站里打开这张卡'))
        }, READY_MS)
      })
    },

    snapshot: () => snap,

    subscribe(fn) {
      snapSubs.add(fn)
      return () => snapSubs.delete(fn)
    },

    send: (text) => request('send', { text }),
    stop: () => request('stop'),
    regenerate: () => request('regenerate'),
    older: () => request('older'),

    async save(state, o) {
      const r = await request<{ size: number }>('save', { state })
      emit({ type: 'save', state, source: o?.source ?? 'app' })
      return r
    },

    gallery: () => request<StageGallery>('gallery'),

    open(tool) {
      if (!parent || !snap || !STAGE_TOOLS.includes(tool)) return false
      request('open', { tool }).catch(() => {})
      return true
    },

    siteUrl(path) {
      return `${snap?.site ?? ''}${path.startsWith('/') ? path : `/${path}`}`
    },

    on(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },

    report(op, error) {
      emit({ type: 'error', op, error })
    },

    dispose() {
      self?.removeEventListener('message', onMessage)
      pending.forEach((p) => {
        clearTimeout(p.timer)
        p.fail(new StageError('network', '舞台已关闭'))
      })
      pending.clear()
      snapSubs.clear()
      listeners.clear()
    },
  }
}
