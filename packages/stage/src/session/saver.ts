import type { StageClient, StageError, StageSave } from '../client'

/**
 * 存档器：游戏只管 saver.save(存档)，什么时候发、发几次、关页面怎么办都归它。
 *
 *   const saver = createSaver(stage)
 *   saver.save(next)                 // 合并：delay 毫秒内的多次改动只发最后一份（默认 800）
 *   saver.save(next, { now: true })  // 立刻发（每轮结算这种关键时刻）
 *   saver.saveNow()                  // 手动保存：把最后一份再发一次
 *   saver.subscribe(() => saver.status)  // 状态：idle / saving / saved / error（React 用 useSaveStatus）
 *
 * ★同一时间只有一个请求在路上；路上的时候又来新的，等它回来再发最新那份（不会旧的后到把新的盖掉）。
 * ★页面关闭 / 切到后台：还没发的立刻用 keepalive 发出去（关了页面也能发完），不丢最后那几下。
 * ★失败不自动无限重试：状态变 error（界面给「重试」），下一次 save 或 saveNow 会再发。
 * ★别处整份存了存档（玩家在本局面板改了）：自动丢掉还没发的旧改动，以它为准（订阅 stage.on）。
 */
export type SaveStatus = {
  state: 'idle' | 'saving' | 'saved' | 'error'
  /** 最近一次存好的时间（ms），没存过＝0 */
  at: number
  error?: StageError
}

export type Saver = {
  save: (state: StageSave, opts?: { now?: boolean }) => void
  /** 手动保存：把最后一份立刻再发一次（没存过就什么都不做） */
  saveNow: () => void
  /** 有没发的就立刻发（返回发完的 Promise） */
  flush: (opts?: { keepalive?: boolean }) => Promise<void>
  /** 存档被别处整份换掉了：丢掉还没发的旧改动，以它为准（stage 上别处的保存会自动调它） */
  reset: (state: StageSave | null) => void
  readonly status: SaveStatus
  subscribe: (fn: () => void) => () => void
  /** 摘掉页面关闭 / stage 事件的监听（一般不用） */
  dispose: () => void
}

export function createSaver(stage: StageClient, { delay = 800 }: { delay?: number } = {}): Saver {
  let last: StageSave | null | undefined // 最新的那份（手动保存发它）
  let pending: StageSave | undefined // 还没发出去的
  let timer: ReturnType<typeof setTimeout> | undefined
  let inflight: Promise<void> | null = null
  let status: SaveStatus = { state: 'idle', at: 0 }
  const subs = new Set<() => void>()
  const set = (s: SaveStatus) => {
    status = s
    subs.forEach((f) => f())
  }

  let manual = false // 这一发是手动保存（广播的 source 用 manual）
  // 要不要 keepalive 记在这里，不跟着某一次调用走：路上有一个时页面要关了，等它回来接着发的那一份也得带上
  // （否则先排队的那条链把最新的一份不带 keepalive 发出去，页面一关就丢了）
  let keep = false
  const send = (keepalive = false): Promise<void> => {
    clearTimeout(timer)
    timer = undefined
    if (keepalive) keep = true
    if (inflight) return inflight.then(() => (pending !== undefined ? send() : undefined))
    if (pending === undefined) return Promise.resolve()
    const body = pending
    pending = undefined
    set({ ...status, state: 'saving', error: undefined })
    const source = manual ? 'manual' : 'saver'
    manual = false
    const ka = keep
    keep = false
    inflight = stage
      .save(body, { keepalive: ka, source })
      .then(() => {
        if (pending === undefined) set({ state: 'saved', at: Date.now() })
      })
      .catch((e: StageError) => {
        if (pending === undefined) pending = body // 没有更新的就把这份留着，下次 save / saveNow 再发
        set({ ...status, state: 'error', error: e })
      })
      .finally(() => {
        inflight = null
      })
    return inflight.then(() => (pending !== undefined && status.state !== 'error' ? send() : undefined))
  }

  // 页面关闭 / 切到后台：没发的立刻发（keepalive）
  const onHide = () => {
    if (document.visibilityState === 'hidden' && (pending !== undefined || timer)) void send(true)
  }
  const onPageHide = () => {
    if (pending !== undefined) void send(true)
  }
  const page = typeof window !== 'undefined' && typeof document !== 'undefined' // 非浏览器环境（测试 / SSR）没有页面事件
  if (page) {
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
  }

  const reset = (state: StageSave | null) => {
    clearTimeout(timer)
    timer = undefined
    pending = undefined
    last = state
    set({ state: 'saved', at: Date.now() })
  }
  // 别处存的（本局面板 / 直接调 stage.save）：以它为准
  const off = stage.on((e) => {
    if (e.type === 'save' && e.source !== 'saver' && e.source !== 'manual') reset(e.state)
  })

  return {
    save(state, opts) {
      last = state
      pending = state
      clearTimeout(timer)
      if (opts?.now) void send()
      else timer = setTimeout(() => void send(), delay)
    },
    saveNow() {
      if (last === undefined || last === null) return
      if (pending === undefined) pending = last
      if (!inflight) manual = true
      void send()
    },
    flush: (opts) => send(opts?.keepalive),
    reset,
    get status() {
      return status
    },
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    dispose() {
      off()
      if (!page) return
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
    },
  }
}
