import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { StageError, type StageClient } from '@dianziji/stage'
import { settingsStore, useSettings, type SettingsStore } from '@dianziji/stage-settings'
import { planLines, type PlannedLine, type SkipReason, type VoiceLine } from './plan'

/**
 * 角色配音：舞台只给「这一轮的台词 + 现在翻到第几句」，其余都在这里——
 *   检查（planLines：写完没有 / 有没有声音 / 字数 / 本轮上限）→ 排队（同时只请求一句；从当前这句往后、最近 LOOKAHEAD 句要念的按顺序一句一句取，
 *   玩家看旁白的时候后面的台词就在后台取好了）
 *   → 播放（翻页、暂停就停）→ 出错一次就把设置里的配音关掉、给一句提示，玩家自己再打开。
 * 设置（开关 / 音量 / 一句上限 / 一轮上限）在 stage-settings 的 voice 一节，面板 sections 写上 'voice' 就有。
 *
 *   const voice = useVoice({ stage, lines, index, streaming, paused })
 *   // 自动播放跟配音联动：要念的句子等它念完、再停一个句末停顿就翻（不再按字数干等）；不念的句子照旧按字数
 *   const auto = useAutoPlay({ text: voice.voiced ? '' : 这一句, ready: tw.done && !voice.busy, … })
 *   <VoiceButton voice={voice} />                                     // 标题栏一颗清楚的「配音」开关
 *
 * ★缓存按台词内容（谁 + 字 + 情绪），不按第几句、不按哪一轮：生成中台词一个字一个字变长、写完这一轮换了 key，
 *   已经念过 / 取过的那句都不会再取、不会从头重播。同一句跨设备重听由网站那边的缓存兜（不扣钱）。
 */

/** suspended＝玩家在她念的时候自己点了下一句：先不念，点一下配音按钮恢复（只在这次打开里，不改设置） */
export type VoiceState = 'off' | 'idle' | 'loading' | 'playing' | 'halted' | 'suspended'

export type UseVoiceOptions = {
  /** 桥（StageBoot 建好的那个：useStageActions().stage） */
  stage: StageClient
  /** 这一轮的台词（按顺序）。who＝角色名或别名，emotion 可选；不是角色台词的位置给 { who: '', text: '' } 占位 */
  lines: readonly VoiceLine[]
  /** 现在翻到第几句 */
  index: number
  /** AI 还在写这一轮：最后一句可能只写了半截，先不念 */
  streaming?: boolean
  /** 玩家在干别的（不在游玩页、开着面板、回看旧的一轮、后台…）：停下，不念不预取 */
  paused?: boolean
  /**
   * 自动配音（默认 true）：开着设置里的配音就自动念、往前排队取。
   * false＝只要单句：不自动念、不预取，只有玩家点了（speakNow / replay）才生成 / 播放——设置里的配音开关不管用
   * （限流按整个阿里账号算，人一多自动配音撑不住；柳月儿 2026-10-09 先只做单句）。
   */
  auto?: boolean
  /** 测试用：换设置 store */
  store?: SettingsStore
}

export type Voice = {
  state: VoiceState
  /** 配音开着吗（玩家的开关） */
  on: boolean
  toggle: () => void
  /** 这一句会念（开着、没暂停、过了检查）：自动播放就不再按字数等，只等声音念完 + 句末停顿 */
  voiced: boolean
  /** 这一句正在取 / 正在念：自动播放拿它挡一下（ready: tw.done && !voice.busy） */
  busy: boolean
  /** 这一句不念的原因（没有＝要念或已念） */
  skip: SkipReason | null
  /** 出错停下时给玩家看的一句（看过调 dismiss） */
  notice: string | null
  dismiss: () => void
  /** 这一句的声音已经取好了（暂停 / 关着也算）：舞台可以在这句旁边放个小喇叭，点了 replay，不扣钱 */
  canReplay: boolean
  /**
   * 这一句的小喇叭该显示成什么：ready 已经生成（点了直接播）/ idle 还没生成（点了要问玩家，确认再 speakNow）
   * / loading 正在生成 / blocked 不能念（没配声音、太长、太短…，原因看 skip）
   */
  lineState: 'ready' | 'idle' | 'loading' | 'blocked'
  /** 玩家点了生成这一句（确认过扣钱）：不管配音开没开、暂停没有，取这一句、取到就播；出错只提示，不关配音 */
  speakNow: () => void
  /** 此刻正在出声（念当前这句 / 重听） */
  playing: boolean
  /** 念这一句：取好的直接从头播；不恢复自动配音（暂停着点了只念这一句） */
  replay: () => void
  /**
   * 玩家自己点了「下一句」（舞台的手动翻页里调，自动播放翻的不调）：
   * 她还在念 / 还在取 → 当成不想听了，停掉、暂停配音（不再取不再念），直到玩家点配音按钮（toggle）恢复；已经念完了＝正常往下读，不影响。
   */
  interrupt: () => void
  stop: () => void
}

type Clip = { url: string } | { skip: true }

/** 往前看几句要念的台词（含当前这句）：一句一句取，最多领先这么多句。提前取的也扣钱，玩家重生成 / 跳走就白花，所以不贪多 */
const LOOKAHEAD = 2

/** 缓存最多记多少句（一局玩很久也不涨内存；被挤掉的再要就重取，网站那边命中缓存不扣钱） */
const MAX_CLIPS = 200

const keyOf = (p: PlannedLine | undefined) => (p && p.ok ? `${p.who}\u001f${p.text}\u001f${p.emotion}` : null)

export function useVoice(o: UseVoiceOptions): Voice {
  const store = o.store ?? settingsStore
  const [settings, set] = useSettings(store)
  const v = settings.voice
  const characters = useSyncExternalStore(
    (fn) => o.stage.subscribe(fn),
    () => o.stage.snapshot()?.characters ?? EMPTY,
  )
  const plan = useMemo(
    () => planLines(o.lines, characters, { maxLine: v.maxLine, maxTurn: v.maxTurn, streaming: o.streaming }),
    [o.lines, characters, v.maxLine, v.maxTurn, o.streaming],
  )

  const [notice, setNotice] = useState<string | null>(null)
  const [suspended, setSuspended] = useState(false)
  /** 自动配音出错停下了（手动那句出错不算）：按钮显示红点 */
  const [halted, setHalted] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'loading' | 'playing'>('idle')
  // 取到一句就 +1：让「这句是不是跳过了」这类从缓存算出来的值跟着刷新
  const [, bump] = useState(0)
  const audio = useRef<HTMLAudioElement | null>(null)
  const clips = useRef(new Map<string, Clip>())
  const inflight = useRef<string | null>(null)
  /** 玩家手动要的那一句（speakNow）：排队优先、取到就播，不看开关 */
  const manual = useRef<string | null>(null)
  /** 开播过的是哪一句（第几句 + 内容）：同一句不从头重播 */
  const started = useRef<string | null>(null)

  const active = (o.auto ?? true) && v.on && !o.paused && !suspended
  const key = keyOf(plan[o.index])
  const pos = `${o.index}\u001e${key}`
  // 从当前这句往后，最近 LOOKAHEAD 句要念的（当前这句要念就排第一）
  const ahead: { k: string; p: PlannedLine }[] = []
  for (let j = o.index; j < plan.length && ahead.length < LOOKAHEAD; j++) {
    const k = keyOf(plan[j])
    if (k) ahead.push({ k, p: plan[j] })
  }
  const aheadSig = ahead.map((a) => a.k).join('\u001d')
  // 异步回来时要读「此刻」的值（取声音期间玩家可能已经翻页 / 关了）
  const now = useRef({ active, key, pos, ahead })
  useEffect(() => {
    now.current = { active, key, pos, ahead }
  })

  const play = useCallback(
    (url: string) => {
      if (!audio.current) {
        const a = new Audio()
        a.preload = 'auto'
        a.addEventListener('playing', () => setPhase('playing'))
        a.addEventListener('ended', () => setPhase('idle'))
        a.addEventListener('pause', () => setPhase((p) => (p === 'playing' ? 'idle' : p)))
        a.addEventListener('error', () => setPhase('idle'))
        audio.current = a
      }
      const a = audio.current
      a.volume = store.get().voice.volume / 100
      if (a.src !== url) a.src = url
      a.currentTime = 0
      // 浏览器拦了自动播放（还没和页面互动过）：不算出错，安静地不念
      void a.play().catch(() => setPhase('idle'))
    },
    [store],
  )

  const stop = useCallback(() => {
    audio.current?.pause()
    setPhase('idle')
  }, [])

  // 取声音、开播、预取都要读最新的 ref，放进一个 ref 里的「引擎」，effect 和回调共用同一份
  const engine = useRef({
    startCurrent: () => {},
    fetch: (_k: string, _p: PlannedLine) => {},
    pump: () => {},
  })
  engine.current.startCurrent = () => {
    const n = now.current
    if (!n.active || !n.key || started.current === n.pos) return
    const have = clips.current.get(n.key)
    if (!have) return
    started.current = n.pos
    if ('url' in have) play(have.url)
    else setPhase('idle')
  }
  /** 排队：往前看的那几句里，第一句还没取的去取（同时只取一句；取完回调里再 pump，一句接一句） */
  engine.current.pump = () => {
    const n = now.current
    if (inflight.current !== null) return
    // 玩家手动要的那句先取（不看开关）
    if (manual.current && n.key === manual.current && !clips.current.has(n.key)) {
      const want = n.ahead.find((a) => a.k === manual.current)
      if (want) return engine.current.fetch(want.k, want.p)
    }
    if (!n.active) return
    const todo = n.ahead.find((a) => !clips.current.has(a.k))
    if (todo) engine.current.fetch(todo.k, todo.p)
  }
  engine.current.fetch = (k, p) => {
    if (!p.ok || clips.current.has(k) || inflight.current !== null) return
    inflight.current = k
    if (k === now.current.key) setPhase('loading')
    o.stage
      .speak({ who: p.who, text: p.text, emotion: p.emotion || undefined })
      .then(
        (r) => ({ url: r.url }) as Clip,
        (e: unknown) => {
          if (e instanceof StageError && e.code === 'no_voice') return { skip: true } as Clip
          throw e
        },
      )
      .then(
        (clip) => {
          inflight.current = null
          if (k === manual.current) {
            manual.current = null
            clips.current.set(k, clip)
            bump((x) => x + 1)
            if ('url' in clip && k === now.current.key) play(clip.url)
            else setPhase('idle')
            engine.current.pump()
            return
          }
          if (!now.current.active) {
            // 暂停 / 关掉期间回来的：记下（下次要念直接用），不播不续取
            clips.current.set(k, clip)
            return
          }
          clips.current.set(k, clip)
          if (clips.current.size > MAX_CLIPS) clips.current.delete(clips.current.keys().next().value as string)
          bump((x) => x + 1)
          if (k === now.current.key) engine.current.startCurrent()
          engine.current.pump()
        },
        (e: unknown) => {
          inflight.current = null
          const why0 = e instanceof StageError ? e.message : '没念出来'
          if (k === manual.current) {
            // 玩家手动点的那一句：只提示，不动配音设置
            manual.current = null
            setPhase('idle')
            setNotice(`这句没生成出来：${why0}`)
            return
          }
          stop()
          setHalted(true)
          set({ voice: { on: false } })
          const why = e instanceof StageError ? e.message : '没念出来'
          setNotice(`配音出错已暂停：${why}。要再开，点「配音」或在「设置」里打开。`)
        },
      )
  }

  // 翻页 / 开关 / 暂停 / 这句写完了 / 后面写出新台词 → 当前这句有了就开播，然后接着排队取后面的
  useEffect(() => {
    now.current = { active, key, pos, ahead }
    const e = engine.current
    if (!active) {
      stop()
      started.current = null
      return
    }
    if (started.current !== pos) {
      if (started.current !== null) stop()
      if (key && clips.current.has(key)) e.startCurrent()
      else if (key) setPhase('loading') // 取完由回调接着播（正在取别的那句就先等它）
      if (!key) started.current = pos // 旁白这类不念的：记下来，翻回来时不误判
    }
    e.pump()
    // 只在「念哪一句 / 往前看的那几句」变了的时候跑；plan、ahead 每次渲染都是新对象，不进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key, pos, aheadSig, stop])

  // 音量跟着设置走
  useEffect(() => {
    if (audio.current) audio.current.volume = v.volume / 100
  }, [v.volume])

  // 卸载：停掉
  useEffect(() => () => audio.current?.pause(), [])

  const replay = useCallback(() => {
    const k = now.current.key
    const have = k ? clips.current.get(k) : undefined
    if (have && 'url' in have) play(have.url)
  }, [play])

  const line = plan[o.index]
  const have = key ? clips.current.get(key) : undefined
  const canReplay = !!have && 'url' in have
  const voiced = active && !!line?.ok && !(have && 'skip' in have)
  const lineState: Voice['lineState'] = !line?.ok || (have && 'skip' in have)
    ? 'blocked'
    : canReplay
      ? 'ready'
      : (key && (inflight.current === key || manual.current === key)) || (voiced && phase === 'loading')
        ? 'loading'
        : 'idle'
  const state: VoiceState = halted && !v.on ? 'halted' : !v.on ? 'off' : suspended ? 'suspended' : phase
  return {
    state,
    on: v.on && !suspended,
    toggle: () => {
      // 暂停着：点一下＝恢复（从当前这句接着念），不是关掉
      if (suspended) {
        started.current = null
        setSuspended(false)
        return
      }
      if (!v.on) {
        setNotice(null)
        setHalted(false)
      }
      set({ voice: { on: !v.on } })
    },
    interrupt: () => {
      if (!(active && (phase === 'loading' || phase === 'playing'))) return
      stop()
      setSuspended(true)
    },
    voiced,
    busy: voiced && phase !== 'idle',
    skip: line && !line.ok ? line.reason : null,
    canReplay,
    lineState,
    speakNow: () => {
      const k = now.current.key
      if (!k) return
      const have = clips.current.get(k)
      if (have && 'url' in have) return play(have.url)
      manual.current = k
      bump((x) => x + 1)
      if (inflight.current === null) engine.current.pump()
    },
    playing: phase === 'playing',
    notice,
    dismiss: () => setNotice(null),
    replay,
    stop,
  }
}

const EMPTY: never[] = []
