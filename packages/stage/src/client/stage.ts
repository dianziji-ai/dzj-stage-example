/**
 * 舞台 API 的客户端：3 个接口 + 1 条流，零依赖、不碰界面。
 * 只用这一层（Vue / 原生 JS / 自己管状态）就从 @dianziji/stage/client 引。
 */
import { decodeToken, type TokenInfo } from './token'
import type { StageErrorCode, StageGallery, StageSave, StageSnapshot, TurnHandlers } from './types'

/** 流里多久一个字都没来就算失败（平台自己 90 秒会判孤儿流，这里多留一点余量） */
const IDLE_MS = 120_000

/** 这些错误可以原样再试一次（连接 / 上游 / 忙 / 太快 / 维护）；token、能量、参数类的再试也没用 */
const RETRYABLE = new Set(['network', 'stream', 'busy', 'rate_limited', 'maintenance', 'error'])

/** 接口失败统一抛这个：message 是给玩家看的中文，code 给程序判断 */
export class StageError extends Error {
  readonly code: StageErrorCode
  readonly status: number
  /** rate_limited 时要等的秒数 */
  readonly retryAfter?: number

  constructor(code: StageErrorCode, message: string, status = 0, retryAfter?: number) {
    super(message)
    this.name = 'StageError'
    this.code = code
    this.status = status
    this.retryAfter = retryAfter
  }

  /** 原样再试一次有没有意义 */
  get retryable(): boolean {
    return RETRYABLE.has(this.code)
  }
}

/** 一轮回复：收流期间可以 close() 停止接收（只是不再收，后台照常生成完） */
export type Turn = {
  id: string
  /** 这一轮结束（done 或 fail）时 resolve 完整原文 / reject StageError */
  finished: Promise<string>
  close: () => void
}

/**
 * 舞台连接上发生的事（stage.on 订阅）。所有保存、所有失败都会广播——
 * 游戏不用管存档是谁改的（自己存的 / 玩家在本局面板改的），订阅一次就能跟着更新界面；
 * 提示组件（StageToaster）也是靠它把 SDK 的结果弹出来。
 */
export type StageOp = 'load' | 'send' | 'stream' | 'save' | 'gallery' | 'turn'
/** 谁存的：saver＝存档器自动存、manual＝手动保存、panel＝玩家在本局面板改的、app＝直接调 stage.save */
export type SaveSource = 'saver' | 'manual' | 'panel' | 'app'
export type StageEvent =
  /** 存档存好了 */
  | { type: 'save'; state: StageSave | null; source: SaveSource }
  /** 某个操作失败了（error.message 是给玩家看的中文） */
  | { type: 'error'; op: StageOp; error: StageError }

export type StageClient = {
  load: (opts?: { limit?: number; before?: number }) => Promise<StageSnapshot>
  /**
   * 发一句话 + 收流。text 原样发出去（SDK 不往里加任何东西）。
   * 想让 AI 知道「此刻状态」（存档 AI 看不到）：自己用 withState(玩家的话, 状态) 拼好再发。
   */
  send: (text: string, handlers?: TurnHandlers) => Promise<Turn>
  /** 接上一个已经在生成的回合（load() 返回的 streaming） */
  resume: (streaming: { turn_id: string; stream_url: string }, handlers?: TurnHandlers) => Turn
  /**
   * 存档（整份覆盖，null 清空）。存好了广播 { type: 'save', state, source }。
   * opts.keepalive：页面关闭时也发得完；opts.source：谁存的（默认 'app'）。一般交给 createSaver 处理。
   */
  save: (state: StageSave | null, opts?: { keepalive?: boolean; source?: SaveSource }) => Promise<{ ok: true; size: number }>
  /** 图册（和网站画廊同一套解锁规则；单独一个接口，打开图册时再调） */
  gallery: () => Promise<StageGallery>
  /**
   * 网站上的页面地址（比如 siteUrl('/recharge') 去充值）。网站地址＝load() 返回的 site（签 token 时玩家所在的域名），
   * 所以要在 load() 之后用；还没 load 过就只给路径本身。
   */
  siteUrl: (path: string) => string
  /** token 里写的东西（会话、模型、线路、过期时间…；只读不验签）。格式不对＝null */
  tokenInfo: () => TokenInfo | null
  /** 订阅连接上的事（存好了 / 失败了），返回取消订阅 */
  on: (fn: (e: StageEvent) => void) => () => void
  /** SDK 之外的代码（会话、组件）也走同一条失败广播（比如游戏规则 onTurn 出错），提示组件就能弹出来 */
  report: (op: StageOp, error: StageError) => void
}

export function createStage({ api, token }: { api: string; token: string }): StageClient {
  const base = (api || '').replace(/\/+$/, '')
  let site = '' // 网站地址：load() 时由服务器给（不从接口地址猜——站点多域名，本地前后端端口也不同）

  const listeners = new Set<(e: StageEvent) => void>()
  const emit = (e: StageEvent) =>
    listeners.forEach((f) => {
      try {
        f(e)
      } catch {
        /* 订阅方自己的错不影响别人 */
      }
    })
  /** 失败统一在这里广播一次再抛出 */
  const fail = (op: StageOp, error: StageError): never => {
    emit({ type: 'error', op, error })
    throw error
  }

  async function call<T>(op: StageOp, method: string, path: string, body?: unknown, keepalive = false): Promise<T> {
    // 没拿到连接（线上没从平台进、本地没配 .env）：别发一个必然失败、还会打到错误地址的请求，直接说清楚
    if (!base || !token) return fail(op, new StageError('unauthorized', '没有拿到进入凭证：请从电子姬网站进入这张卡'))
    let r: Response
    try {
      r = await fetch(base + path, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        keepalive, // 关页面时也要把这次请求发完（存档用；浏览器限 64KB，和存档上限一样）
      })
    } catch {
      return fail(op, new StageError('network', '网络连接失败'))
    }
    const data = await r.json().catch(() => null)
    if (!r.ok) {
      const e = data?.error
      const wait = Number(r.headers.get('Retry-After')) || undefined
      return fail(op, new StageError(e?.code ?? 'error', e?.message ?? `请求失败（${r.status}）`, r.status, wait))
    }
    return data as T
  }

  /**
   * 收一轮的流。四种结束方式只会触发一次：done 写完 / fail 上游出错（不扣费）/ 连接断了 / 2 分钟一个字都没来。
   * ★连接断开要自己处理：EventSource 断网后会无限自动重连、永远不报错，不处理界面就一直卡在「生成中」。
   */
  function stream(turnId: string, url: string, h: TurnHandlers = {}): Turn {
    let text = ''
    let reasoning = ''
    let es: EventSource | null = new EventSource(url)
    let over = false
    let errors = 0 // 连续连接错误（收到数据就清零）
    let idle: ReturnType<typeof setTimeout> | undefined
    let settle!: { ok: (t: string) => void; fail: (e: Error) => void }
    const finished = new Promise<string>((ok, fail) => (settle = { ok, fail }))
    finished.catch(() => {}) // 调用方只用回调不 await 时，别冒成未处理的 rejection

    const close = () => {
      clearTimeout(idle)
      es?.close()
      es = null
    }
    const finish = (err?: StageError) => {
      if (over) return
      over = true
      close()
      // ★先把这一轮了结（finished 一定会结束），再调回调；回调里抛错只记日志，不能让这一轮卡在「没结束」
      if (err) {
        emit({ type: 'error', op: 'stream', error: err })
        settle.fail(err)
        guard(() => h.onFail?.(err))
      } else {
        settle.ok(text)
        guard(() => h.onDone?.(text))
      }
    }
    const watchdog = () => {
      clearTimeout(idle)
      idle = setTimeout(() => finish(new StageError('network', '等了太久没有回应，这一轮先算了（没写完的不扣费）')), IDLE_MS)
    }
    watchdog()

    es.onmessage = (e) => {
      errors = 0
      watchdog()
      let d: { c?: string; r?: string }
      try {
        d = JSON.parse(e.data)
      } catch {
        return // 坏数据跳过，不让整页报错
      }
      if (d.c) {
        text += d.c
        h.onDelta?.(text, d.c)
      } else if (d.r) {
        reasoning += d.r
        h.onReasoning?.(reasoning, d.r)
      }
    }
    es.addEventListener('done', () => finish())
    // 事件名是 fail 不是 error：error 是 EventSource 自带的连接错误
    es.addEventListener('fail', (e) => {
      let msg = '生成失败'
      try {
        msg = JSON.parse((e as MessageEvent).data).message || msg
      } catch {
        /* 用默认文案 */
      }
      finish(new StageError('stream', msg))
    })
    // 连接错误：浏览器放弃重连（CLOSED）或连续 3 次都没连上 → 这一轮结束
    es.onerror = () => {
      errors++
      if (!es || es.readyState === EventSource.CLOSED || errors >= 3) finish(new StageError('network', '连接断了'))
    }

    // 调用方主动不收了（离开页面等）：只关连接，不触发回调
    const stop = () => {
      if (over) return
      over = true
      close()
    }
    return { id: turnId, finished, close: stop }
  }

  return {
    load(opts = {}) {
      const q = new URLSearchParams()
      if (opts.limit) q.set('limit', String(opts.limit))
      if (opts.before) q.set('before', String(opts.before))
      const qs = q.toString()
      return call<StageSnapshot>('load', 'GET', qs ? `?${qs}` : '').then((snap) => {
        site = snap.site
        return snap
      })
    },

    async send(text, handlers) {
      const r = await call<{ turn_id: string; stream_url: string }>('send', 'POST', '/messages', { text })
      return stream(r.turn_id, r.stream_url, handlers)
    },

    resume(s, handlers) {
      return stream(s.turn_id, s.stream_url, handlers)
    },

    async save(state, opts) {
      const r = await call<{ ok: true; size: number }>('save', 'PUT', '/save', state, opts?.keepalive)
      emit({ type: 'save', state, source: opts?.source ?? 'app' })
      return r
    },

    on(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },

    report(op, error) {
      emit({ type: 'error', op, error })
    },

    gallery() {
      return call<StageGallery>('gallery', 'GET', '/gallery')
    },

    tokenInfo() {
      return decodeToken(token)
    },

    siteUrl(path) {
      return `${site}${path.startsWith('/') ? path : `/${path}`}`
    },
  }
}

/** 跑调用方给的回调：抛错只打日志（带上原错误，作者在控制台能看到），不往外冒 */
function guard(fn: () => void) {
  try {
    fn()
  } catch (e) {
    console.error('[stage] 回调出错：', e)
  }
}
