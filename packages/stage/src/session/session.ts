import { createSaver, type Saver } from './saver'
import { readZones, type StageZones } from './zones'
import { closedOf, lastAiText, latestZones, stabilize, writingZone } from './zonetrack'
import { splitState, StageError, type StageClient, type StageMessage, type StageSave, type StageSnapshot } from '../client'

/**
 * 一局游戏的会话：舞台要的「聊天 + 历史 + 存档」全在这里，游戏只写自己的规则。
 *
 *   const session = createSession({
 *     stage, snapshot,
 *     normalize: (raw) => 补默认的存档,                         // 可选
 *     onTurn: ({ raw, zones, save }) => 这一轮写完后的新存档,      // 可选：游戏规则就写在这
 *   })
 *   session.send('我推开门') / session.retry() / session.loadOlder() / session.setSave(...)
 *   session.subscribe(() => session.getState())               // React 用 useStage()
 *
 * 它替游戏做掉的事（每个舞台都要、自己写容易出 bug 的）：
 *   · 发消息：先把这句话显示出来（点了就有反应），网站没接受再撤回；同一时间只有一轮
 *   · 跟着网站走：网站推来的快照（谁发的都一样：舞台、网站输入框、快捷指令、重生）→ live 是到目前为止的原文；
 *     写完自动进历史；出错按错误码给「再说一次」；网站那边回溯 / 编辑 / 删除，历史跟着换
 *   · 进来时那一轮还在生成：接着显示
 *   · 往前翻历史：请网站读更早的
 *   · 存档：内置存档器（合并连续改动、串行、关页面时发完）；玩家在本局面板改了存档，这里自动换成新的
 *   · 结算（onTurn）：AI 这一轮写完的那一刻、玩家在场时算一次。玩家提前走了、这一轮没结算就算了（不补算）——
 *     存档和历史本来就允许对不上（玩家能在网站上编辑 / 重新生成回复，也能在本局面板改存档），AI 自己会容错
 */

export type TurnResult<S> = {
  /** 这一轮的完整原文 */
  raw: string
  zones: StageZones
  /** 结算前 / 后的存档（做「好感 +3」「解锁新 CG」这类动效用：比较两份） */
  prev: S
  next: S
  /** 第几次结算（每次 +1，React 里当 key / effect 依赖用） */
  n: number
}

export type SessionOptions<S> = {
  stage: StageClient
  snapshot: StageSnapshot
  /** 读回来的存档过一遍：补默认值、丢非法值（不给＝原样；卡没定义存档结构时是 {}）。玩家在面板改了存档时也会过一遍 */
  normalize?: (raw: StageSave | null, snap: StageSnapshot) => S
  /** 一轮写完：按这一轮的原文 / 分区算新存档（游戏规则写在这）。返回 undefined＝存档不变 */
  onTurn?: (turn: { raw: string; zones: StageZones; save: S; snap: StageSnapshot }) => S | void
  /** 存档器合并连续改动的时间（ms，默认 800） */
  saveDelay?: number
}

export type SessionState<S> = {
  /** 这一局的最新快照（卡、分区、初始设定、玩家、配图库、模型…） */
  snap: StageSnapshot
  /** 已经拿到的历史（正序；往前翻的拼在前面，写完的拼在后面） */
  history: StageMessage[]
  /** 更早还有 */
  hasOlder: boolean
  /** 正在生成的这一轮：到目前为止的原文；没在生成＝null（刚发出去还没来字＝''） */
  live: string | null
  /** 正在生成的这一轮的思维链（多数舞台用不到） */
  reasoning: string
  /** 正在生成（live !== null） */
  busy: boolean
  /** 正在生成的这一轮，玩家说的那句（已去掉附带的 <dj_state> 状态，直接拿去显示） */
  said: string
  /** 出错了：error.code 决定给什么按钮；retry＝能「再说一次」的那句话（连接 / 上游出错时才有） */
  error: { error: StageError; retry?: string } | null
  /** 存档（normalize 过的） */
  save: S
  /** 卡定义了存档结构（能存档） */
  canSave: boolean
  /** 最近一次结算（onTurn）的结果；没结算过＝null */
  lastTurn: TurnResult<S> | null
  /**
   * 这一轮的分区：生成中＝正在写的这一轮（每帧最多解析一次）；没在生成＝最后一条写完的 AI 回复。
   * ★内容没变的区是同一个对象（稳定引用）：按区订阅（useZone）的组件只在那个区变了才重渲染
   */
  zones: StageZones
  /** 每个区最近一次写过的值（已经写完的历史里找；这一轮还没写到时 useZone({ hold }) 用它） */
  held: StageZones
  /** 这一轮每个出现过的区写完了没有（出现结束标签） */
  closed: Record<string, boolean>
  /** AI 正在写哪个区（按卡里分区的顺序判断）；没在生成＝null */
  writing: string | null
  /**
   * 回看：正在看哪一条 AI 回复（history 里的 id）；null＝看最新（平时）。
   * 回看时 zones / held 都换成「那一轮」的：按区订阅（useZone…）的组件自动倒回那一轮，不用改。
   * ★只是看：存档不动、不结算；玩家一发话（或 AI 开始写新一轮）自动回到最新。见 viewTurn / useTurnCursor
   */
  view: number | null
}

export type Session<S> = {
  getState: () => SessionState<S>
  subscribe: (fn: () => void) => () => void
  /** 发一句话（原样发；要附状态自己 withState 拼）。成功发出去＝true（之后的事看 live / error） */
  send: (text: string) => Promise<boolean>
  /** 「再说一次」：把出错的那句原样再发 */
  retry: () => Promise<boolean>
  dismissError: () => void
  /** 往前翻（请网站读更早的）；false＝没取到（界面给重试） */
  loadOlder: () => Promise<boolean>
  /** 停止生成（已经写出来的字保留） */
  stop: () => Promise<boolean>
  /** 重新生成最后一条 AI 回复（消耗能量）；生成中 / 没有可重生的＝false */
  regenerate: () => Promise<boolean>
  /** 回看某一条 AI 回复（history 里的 id）；null＝回到最新。生成中不能回看（返回 false） */
  viewTurn: (id: number | null) => boolean
  /** 回看上一轮（已加载的最早一轮再往前：自动 loadOlder）；没有更早的＝false */
  prevTurn: () => Promise<boolean>
  /** 回看下一轮；到最新那一轮＝回到最新（view＝null） */
  nextTurn: () => boolean
  /** 改存档（新值或函数）：本地立刻生效，存档器合并后发出去；now＝立刻发 */
  setSave: (next: S | ((save: S) => S), opts?: { now?: boolean }) => void
  /** 手动保存 */
  saveNow: () => void
  /** 原文 → 分区（和网站聊天页同一套解析；当前这一轮的分区直接看 state.zones / useZone） */
  readZones: (raw: string) => StageZones
  /** 不用了：摘掉所有监听 */
  dispose: () => void
  readonly saver: Saver
  readonly stage: StageClient
}

/** 能「再说一次」的错误：连接断了、上游出错（没写完的不扣费） */
const RETRY_CODES = new Set(['network', 'stream', 'error'])

export function createSession<S = StageSave>(opts: SessionOptions<S>): Session<S> {
  const { stage, snapshot: snap, onTurn } = opts
  const normalize = (raw: StageSave | null): S => (opts.normalize ? opts.normalize(raw, snap) : ((raw ?? {}) as S))
  const canSave = snap.state_schema != null
  const saver = createSaver(stage, { delay: opts.saveDelay })

  let tmp = 0 // 本地插进去的消息用负数 id，不会和服务器的撞
  let lastSent = ''
  /** 这一轮网站已经报过「在生成」：等它结束（live 变 null）时结算一次。进来时那一轮还在生成也算 */
  let sawLive = !!snap.live
  const subs = new Set<() => void>()

  let state: SessionState<S> = {
    snap,
    history: snap.history,
    hasOlder: snap.has_more,
    live: snap.live ? snap.live.text : null,
    reasoning: snap.live?.reasoning ?? '',
    busy: !!snap.live,
    said: snap.live?.said ?? '',
    error: null,
    save: normalize(snap.save),
    canSave,
    lastTurn: null,
    zones: readZones(snap.live ? snap.live.text : lastAiText(snap.history), snap),
    held: latestZones(snap.history, (raw) => readZones(raw, snap)),
    closed: {},
    writing: null,
    view: null,
  }
  const set = (patch: Partial<SessionState<S>>) => {
    state = { ...state, ...patch }
    subs.forEach((f) => f())
  }

  // ── 分区追踪：生成中每帧最多解析一次（同一帧来的几段字合并），写完立刻定稿 ──
  const ids = (snap.slots ?? []).map((sl) => sl.zone)
  const read = (raw: string) => readZones(raw, snap)
  const zonesOf = (raw: string) => {
    const zones = stabilize(read(raw), state.zones)
    return { zones, closed: closedOf(raw, zones) }
  }
  let frame: number | null = null
  const cancelFrame = () => {
    if (frame !== null) (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout)(frame as never)
    frame = null
  }
  const scheduleZones = () => {
    if (frame !== null) return
    const run = () => {
      frame = null
      if (state.live === null) return
      set({ ...zonesOf(state.live), writing: writingZone(state.live, ids) })
    }
    frame = (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(run) : setTimeout(run, 16)) as unknown as number
  }
  /** 回到「没在生成」：这一轮的分区＝最后一条写完的 AI 回复；最近写过的值跟着历史更新 */
  const settledZones = (history: StageMessage[]) => {
    cancelFrame()
    const zones = stabilize(read(lastAiText(history)), state.zones)
    const all: Record<string, boolean> = {}
    for (const id of Object.keys(zones)) all[id] = true
    return { zones, closed: all, writing: null, held: latestZones(history, read, state.held) }
  }

  /** 回看第 id 条 AI 回复：这一轮的分区＝那一条；最近写过的值＝截至那一条（含）的历史里找 */
  const viewedZones = (history: StageMessage[], id: number) => {
    const i = history.findIndex((m) => m.id === id)
    const zones = stabilize(read(history[i].content), state.zones)
    const all: Record<string, boolean> = {}
    for (const z of Object.keys(zones)) all[z] = true
    return { zones, closed: all, writing: null, held: latestZones(history.slice(0, i + 1), read, state.held) }
  }
  const viewTurn: Session<S>['viewTurn'] = (id) => {
    if (state.busy) return false
    if (id === null) {
      if (state.view !== null) set({ view: null, ...settledZones(state.history) })
      return true
    }
    if (!aiTurns(state.history).some((m) => m.id === id)) return false
    // 回看的正好是最新那一条＝就是平时
    const turns = aiTurns(state.history)
    if (turns[turns.length - 1]?.id === id) return viewTurn(null)
    set({ view: id, ...viewedZones(state.history, id) })
    return true
  }

  /** 存档交给存档器（卡没定义存档结构就只改本地） */
  const persist = (save: S, now = false) => {
    if (!canSave) return
    saver.save(save as StageSave, { now })
  }

  /** 一轮写完：按游戏规则算新存档、记下「这一轮结算过了」 */
  const settle = (raw: string) => {
    if (!onTurn) return
    const prev = state.save
    const zones = readZones(raw, snap)
    let next = prev
    try {
      next = onTurn({ raw, zones, save: prev, snap }) ?? prev
    } catch (e) {
      // ★游戏规则抛错：这一轮存档不变，游戏照常玩（不让作者的 bug 把这一轮卡住）；玩家看到提示，原因在控制台
      console.error('[stage] onTurn 出错，这一轮的存档没改：', e)
      stage.report('turn', new StageError('error', '这一轮的状态没算上（游戏规则出错了）'))
    }
    set({ save: next, lastTurn: { raw, zones, prev, next, n: (state.lastTurn?.n ?? 0) + 1 } })
    persist(next, true) // 结算是关键时刻：立刻存
  }

  // 进来时：存档器以读回的为准（手动保存发的就是它）
  saver.reset(canSave ? (snap.save ?? null) : null)

  /**
   * 跟着网站走：网站推来的快照变了（init 之后的 update）。
   *   · live 有值＝在生成：原文喂给分区追踪（谁发的都一样）
   *   · live 从有变成 null＝这一轮结束：没出错 → 历史已经带上了最终那条，结算一次（onTurn）；出错 → 给「再说一次」
   *   · 只变了 history（回溯 / 编辑 / 删除 / 读更早的）：整份换成最新的，不结算
   */
  const onSnapshot = (next: StageSnapshot, changed: readonly (keyof StageSnapshot)[]) => {
    const has = (k: keyof StageSnapshot) => changed.includes(k)
    const patch: Partial<SessionState<S>> = { snap: next }
    if (has('history') || has('has_more')) {
      patch.history = next.history
      patch.hasOlder = next.has_more
      // 回看的那一条被删掉了（回溯 / 删除）：回到最新
      if (state.view !== null && !next.history.some((m) => m.id === state.view)) patch.view = null
    }
    // 别处改了存档（网站推来新的；舞台自己存的网站不回推）：以它为准，存档器丢掉没发的旧改动
    if (has('save') && canSave) {
      patch.save = normalize(next.save)
      saver.reset(next.save ?? null)
    }
    const history = patch.history ?? state.history
    if (next.live) {
      // 在生成：一开始（或别处发起的一轮）先清掉这一轮的分区、回到最新
      if (!sawLive) Object.assign(patch, { view: null, zones: {}, closed: {}, writing: null, error: null })
      sawLive = true
      set({ ...patch, busy: true, live: next.live.text, reasoning: next.live.reasoning, said: next.live.said })
      scheduleZones()
      return
    }
    if (sawLive) {
      // 这一轮结束
      sawLive = false
      const err = next.error ? turnError(next.error) : null
      set({ ...patch, busy: false, live: null, reasoning: '', said: '', error: err, ...settledZones(history) })
      if (!err) {
        const raw = lastAiText(history)
        if (raw) settle(raw)
      }
      return
    }
    if (has('error') && next.error) patch.error = turnError(next.error)
    if (patch.history && !state.busy) Object.assign(patch, patch.view === null || state.view === null ? settledZones(history) : viewedZones(history, state.view))
    set(patch)
  }
  const turnError = (e: NonNullable<StageSnapshot['error']>) => ({
    error: new StageError(e.code, e.message, e.retryAfter),
    retry: e.retry ?? (RETRY_CODES.has(e.code) && lastSent ? lastSent : undefined),
  })
  const unsubscribe = stage.subscribe(onSnapshot)

  // 别处存了存档（玩家在本局面板改了 / 直接调 stage.save）：换成新的（存档器自己也会丢掉没发的旧改动）
  const off = stage.on((e) => {
    if (e.type !== 'save' || e.source === 'saver' || e.source === 'manual') return
    set({ save: normalize(e.state) })
  })

  const send: Session<S>['send'] = async (text) => {
    const t = text.trim()
    if (!t || state.busy) return false
    lastSent = t
    const id = --tmp
    // 一点就先把这句显示出来 + 进入「生成中」（请求要等一会儿，别让画面没反应）；发失败再撤回
    // 新一轮开始：这一轮的分区清空（还没写），hold 的区用最近写过的值
    set({ view: null, error: null, busy: true, live: '', reasoning: '', said: splitState(t).text, history: [...state.history, { id, role: 'user', kind: null, content: t, created_at: new Date().toISOString() }], zones: {}, closed: {}, writing: null })
    try {
      await stage.send(t)
      return true
    } catch (e) {
      const err = e instanceof StageError ? e : new StageError('error', '出了点问题')
      const history = state.history.filter((m) => m.id !== id)
      set({ busy: false, live: null, said: '', history, ...settledZones(history), error: { error: err, retry: RETRY_CODES.has(err.code) ? t : undefined } })
      return false
    }
  }

  let olderBusy = false
  const loadOlder: Session<S>['loadOlder'] = async () => {
    if (olderBusy || !state.hasOlder) return true
    olderBusy = true
    try {
      await stage.older() // 读到的随快照的 history 推过来（onSnapshot 换上）
      return true
    } catch {
      return false
    } finally {
      olderBusy = false
    }
  }

  return {
    getState: () => state,
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    send,
    retry: () => (state.error?.retry ? send(state.error.retry) : Promise.resolve(false)),
    dismissError: () => set({ error: null }),
    loadOlder,
    async stop() {
      if (!state.busy) return false
      try {
        await stage.stop()
        return true
      } catch {
        return false
      }
    },
    async regenerate() {
      if (state.busy || !aiTurns(state.history).length) return false
      try {
        await stage.regenerate()
        return true
      } catch {
        return false
      }
    },
    viewTurn,
    async prevTurn() {
      if (state.busy) return false
      let turns = aiTurns(state.history)
      let i = state.view === null ? turns.length - 1 : turns.findIndex((m) => m.id === state.view)
      if (i <= 0) {
        if (!state.hasOlder || !(await loadOlder())) return false
        turns = aiTurns(state.history)
        i = state.view === null ? turns.length - 1 : turns.findIndex((m) => m.id === state.view)
        if (i <= 0) return false
      }
      return viewTurn(turns[i - 1].id)
    },
    nextTurn() {
      if (state.view === null) return false
      const turns = aiTurns(state.history)
      const i = turns.findIndex((m) => m.id === state.view)
      return viewTurn(turns[i + 1]?.id ?? null)
    },
    setSave(next, o) {
      const save = typeof next === 'function' ? (next as (s: S) => S)(state.save) : next
      set({ save })
      persist(save, o?.now)
    },
    saveNow: () => saver.saveNow(),
    readZones: (raw) => readZones(raw, snap),
    dispose() {
      cancelFrame()
      unsubscribe()
      off()
      saver.dispose()
      subs.clear()
    },
    saver,
    stage,
  }
}

/** 能回看的 AI 回复：写完的（断流的半截不算）、有内容的；开场也算（第 0 轮） */
export function aiTurns(history: StageMessage[]): StageMessage[] {
  return history.filter((m) => m.role === 'assistant' && m.content.trim() && m.status !== 'error')
}

/** 某条 AI 回复之前，玩家说的那句（已去掉 <dj_state>）；开场之前没有＝'' */
export function saidBefore(history: StageMessage[], id: number): string {
  const i = history.findIndex((m) => m.id === id)
  for (let k = i - 1; k >= 0; k--) {
    if (history[k].role === 'assistant') return ''
    if (history[k].role === 'user') return splitState(history[k].content).text
  }
  return ''
}
