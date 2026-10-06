import { useCallback, useEffect, useRef, useState } from 'react'
import { bgm } from '../audio/bgm'
import { bgUrl, spriteUrl, withCall } from '../game/content'
import type { ClawSave } from '../game/logic'
import { plushName, plushUrl, RARITY_LABEL, type PlushId } from './data'
import { showTip } from '../game/tipStore'
import { line, type Line } from './lines'
import { CHUTE_X, clamp, easeIn, easeInOut, easeOut, grab, makePile, seeded, swingX, X_MAX, X_MIN, type Outcome, type Plush } from './logic'

/**
 * 抓娃娃机（全屏页）。夹子自动来回摆，点「放下！」落爪：落下 → 合拢 → 提起（没抓牢半路滑落）→ 移到出口 → 松开。
 *
 * ★性能（手机优先）：
 *  · 只有一个 rAF 循环，且只在「摆动 / 一局进行中」跑；出结果、离开页面、没币了就停。
 *  · 每帧只写 3 个元素的 transform（夹子、吊绳、被夹的娃娃）——不改布局、不走 React 重渲染。
 *  · React state 只在阶段切换时变（一局 5 次左右）。
 *  · 不用 blur / filter / 阴影动画；跑马灯只动 opacity。娃娃图 256px、异步解码。
 */

const Y_TOP = 0.07 // 夹子停在顶上的高度
const T = { drop: 0.75, close: 0.28, lift: 0.85, carry: 0.7, release: 0.45 } // 各段时长（秒）
const SWING = 2.6 // 夹子来回摆一趟的秒数

type Phase = 'ready' | 'run' | 'won'

export default function ClawGame({ claw, busy, call, onUpdate, onGift, onLeave }: {
  claw: ClawSave
  busy: boolean
  /** 她对你的称呼：台词里的「主人」换成它 */
  call: string
  onUpdate: (fn: (c: ClawSave) => ClawSave) => void
  /** 送娃娃：父组件扣收藏、回游玩页、发消息 */
  onGift: (id: PlushId) => void
  /** 离开：report＝要不要把这次的战绩告诉她（null＝不说） */
  onLeave: (report: string | null) => void
}) {
  const rng = useRef(seeded(Date.now()))
  const [pile, setPile] = useState<Plush[]>(() => makePile(rng.current))
  const nextKey = useRef(100)
  const [phase, setPhase] = useState<Phase>('ready')
  const [closed, setClosed] = useState(false) // 爪子合拢
  const [won, setWon] = useState<Plush | null>(null)
  const [talk, setTalk] = useState<Line>(() => line('idle'))
  const [session, setSession] = useState<{ plays: number; got: PlushId[] }>({ plays: 0, got: [] })
  const [asking, setAsking] = useState(false) // 离开时问要不要告诉她

  const box = useRef<HTMLDivElement>(null)
  const clawEl = useRef<HTMLDivElement>(null)
  const ropeEl = useRef<HTMLDivElement>(null)
  const plushEls = useRef(new Map<number, HTMLDivElement>())
  const size = useRef({ w: 0, h: 0 })
  const pos = useRef({ x: 0.5, y: Y_TOP }) // 夹子当前位置（比例）
  // ★摆动和一局动画必须各用各的编号：共用一个时，play() 刚把编号换成「这一局」，
  //   紧接着 phase / 硬币变化触发摆动 effect 的清理，取消的就是这一局 → 夹子不动、按钮卡在「……」。
  const swingRaf = useRef(0)
  const runRaf = useRef(0)
  const swingT0 = useRef(performance.now())
  const pileRef = useRef(pile)
  useEffect(() => {
    pileRef.current = pile
  }, [pile])

  // ── 写 transform（每帧只碰这几个元素）──
  const paintClaw = useCallback(() => {
    const { w, h } = size.current
    const { x, y } = pos.current
    if (clawEl.current) clawEl.current.style.transform = `translate3d(${x * w}px, ${y * h}px, 0)`
    if (ropeEl.current) ropeEl.current.style.transform = `translate3d(${x * w}px, 0, 0) scaleY(${y * h + 2})`
  }, [])
  const plushSize = () => size.current.w * 0.2
  const baseTransform = (p: Plush) => {
    const s = plushSize()
    return `translate3d(${p.x * size.current.w - s / 2}px, ${p.y * size.current.h - s / 2}px, 0) rotate(${p.tilt}deg)`
  }
  const movePlush = (p: Plush, x: number, y: number, opacity = 1) => {
    const el = plushEls.current.get(p.key)
    if (!el) return
    const s = plushSize()
    el.style.transform = `translate3d(${x * size.current.w - s / 2}px, ${y * size.current.h - s / 2}px, 0)`
    el.style.opacity = String(opacity)
  }

  // 机箱尺寸（只在尺寸变时量一次，不每帧读布局）
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      size.current = { w: el.clientWidth, h: el.clientHeight }
      paintClaw()
      for (const p of pileRef.current) {
        const pe = plushEls.current.get(p.key)
        if (pe) pe.style.transform = baseTransform(p)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintClaw])

  // ── 摆动：只在 ready 且有币时跑 ──
  useEffect(() => {
    if (phase !== 'ready' || claw.coins <= 0) return
    // 从当前位置接着摆：在摆动范围内就反推相位；在范围外（刚把娃娃送到出口）先用 0.3s 滑回最左端再摆
    const from = pos.current.x
    const inRange = from >= X_MIN && from <= X_MAX
    const phase0 = inRange ? (Math.acos(clamp(1 - (2 * (from - X_MIN)) / (X_MAX - X_MIN), -1, 1)) / (2 * Math.PI)) * SWING : 0
    const start = performance.now()
    swingT0.current = start - phase0 * 1000
    const loop = (now: number) => {
      const glide = inRange ? 1 : clamp((now - start) / 300, 0, 1)
      if (glide < 1) pos.current = { x: from + (X_MIN - from) * easeOut(glide), y: Y_TOP }
      else pos.current = { x: swingX((now - swingT0.current - (inRange ? 0 : 300)) / 1000, SWING), y: Y_TOP }
      paintClaw()
      swingRaf.current = requestAnimationFrame(loop)
    }
    swingRaf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(swingRaf.current)
  }, [phase, claw.coins, paintClaw])

  useEffect(() => {
    if (claw.coins <= 0 && phase === 'ready') setTalk(line('broke'))
  }, [claw.coins, phase])

  // ── 一局：按时间线逐段算位置 ──
  const play = () => {
    if (phase !== 'ready' || claw.coins <= 0) return
    cancelAnimationFrame(swingRaf.current)
    const x0 = pos.current.x
    const out: Outcome = grab(pileRef.current, x0, rng.current)
    const target = out.kind === 'miss' ? null : out.plush
    const yDown = target ? target.y - 0.09 : 0.86
    onUpdate((c) => ({ ...c, coins: c.coins - 1, plays: c.plays + 1 }))
    setSession((s) => ({ ...s, plays: s.plays + 1 }))
    setPhase('run')
    setTalk(line('drop', rng.current))
    bgm.sfx('drop')

    const segs = [T.drop, T.close, T.lift, ...(out.kind === 'win' ? [T.carry, T.release] : [])]
    const ends = segs.map((_, i) => segs.slice(0, i + 1).reduce((a, b) => a + b, 0))
    const t0 = performance.now()
    let closedOnce = false
    let slipped = false

    const loop = (now: number) => {
      const t = (now - t0) / 1000
      const seg = ends.findIndex((e) => t < e)
      const i = seg === -1 ? segs.length : seg
      const k = i < segs.length ? clamp((t - (i ? ends[i - 1] : 0)) / segs[i], 0, 1) : 1

      if (i === 0) pos.current = { x: x0, y: Y_TOP + (yDown - Y_TOP) * easeIn(k) }
      else if (i === 1) {
        if (!closedOnce) {
          closedOnce = true
          setClosed(true)
          navigator.vibrate?.(12)
          bgm.sfx('grab')
        }
      } else if (i === 2) {
        pos.current = { x: x0, y: yDown + (Y_TOP - yDown) * easeInOut(k) }
        if (target && out.kind === 'slip' && k >= out.at && !slipped) {
          slipped = true
          setClosed(false)
          setTalk(line('slip', rng.current))
          bgm.sfx('miss')
          dropBack(target, pos.current.y + 0.09)
        }
        if (target && !slipped) movePlush(target, pos.current.x, pos.current.y + 0.09)
      } else if (i === 3) {
        pos.current = { x: x0 + (CHUTE_X - x0) * easeInOut(k), y: Y_TOP }
        movePlush(target!, pos.current.x, pos.current.y + 0.09)
      } else if (i === 4) {
        if (closedOnce) {
          closedOnce = false
          setClosed(false)
        }
        movePlush(target!, CHUTE_X, Y_TOP + 0.09 + easeIn(k) * 1.0, 1 - k)
      }
      paintClaw()

      if (i < segs.length) {
        runRaf.current = requestAnimationFrame(loop)
        return
      }
      // ── 一局结束 ──
      setClosed(false)
      if (out.kind === 'win') {
        const p = out.plush
        onUpdate((c) => ({ ...c, wins: c.wins + 1, collection: { ...c.collection, [p.id]: (c.collection[p.id] ?? 0) + 1 } }))
        setSession((s) => ({ ...s, got: [...s.got, p.id] }))
        setTalk(line(p.rarity, rng.current))
        navigator.vibrate?.([10, 40, 10])
        bgm.sfx(p.rarity === 'gold' ? 'gold' : 'win')
        setWon(p)
        setPhase('won')
      } else {
        if (out.kind === 'miss') {
          setTalk(line('miss', rng.current))
          bgm.sfx('miss')
        }
        setTimeout(() => setPhase('ready'), 900) // 失手不弹卡片，马上能接着玩
      }
    }
    runRaf.current = requestAnimationFrame(loop)
  }

  /** 滑落：从当前高度掉回原位，最后轻轻弹一下（独立的小动画，0.45s） */
  const dropBack = (p: Plush, fromY: number) => {
    const t0 = performance.now()
    const fall = (now: number) => {
      const k = clamp((now - t0) / 450, 0, 1)
      const bounce = k > 0.8 ? Math.sin(((k - 0.8) / 0.2) * Math.PI) * 0.015 : 0
      movePlush(p, p.x, fromY + (p.y - fromY) * easeIn(Math.min(1, k / 0.8)) - bounce)
      if (k < 1) requestAnimationFrame(fall)
      else {
        const el = plushEls.current.get(p.key)
        if (el) el.style.transform = baseTransform(p)
      }
    }
    requestAnimationFrame(fall)
  }

  /** 抓到后：把这只从堆里拿掉，补一只新的 */
  const refill = (p: Plush) => {
    const fresh = makePile(rng.current, 1, nextKey.current++)[0]
    setPile((cur) => cur.map((q) => (q.key === p.key ? { ...fresh, x: p.x, y: p.y } : q)))
  }
  const again = () => {
    if (won) refill(won)
    setWon(null)
    setTalk(line('idle', rng.current))
    setPhase('ready')
  }
  // 送给她＝替玩家发一句话（她接着写收到礼物的反应，消耗一轮能量）：先确认，别误点就扣
  const gift = () => {
    if (!won) return
    const w = won
    showTip({
      icon: '🎁',
      title: `把「${plushName(w.id)}」送给电子姬？`,
      text: `会替你说一句「把刚抓到的${plushName(w.id)}送给她」，\n她会接着写收到礼物的反应。`,
      note: '⚡ 算一轮对话，会消耗能量',
      action: {
        label: '送给她',
        onClick: () => {
          refill(w)
          onGift(w.id)
        },
      },
      dismiss: '先留着',
    })
  }
  const leave = () => {
    if (phase === 'run') return
    if (session.plays > 0 && !busy) setAsking(true)
    else onLeave(null)
  }
  const report = () => {
    const got = session.got.map(plushName)
    onLeave(`（在电玩城玩了 ${session.plays} 局抓娃娃，${got.length ? `抓到了${got.join('、')}` : '一只都没抓到'}）`)
  }

  useEffect(
    () => () => {
      cancelAnimationFrame(swingRaf.current)
      cancelAnimationFrame(runRaf.current)
    },
    [],
  )

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[#140c22] text-white select-none">
      {/* 背景：电玩城底图 + 压暗（静态，不模糊） */}
      <img src={bgUrl('arcade')} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#140c22]/40 via-transparent to-[#140c22]/90" />

      {/* 顶栏 */}
      <div className="relative flex items-center gap-2 px-safe pt-safe">
        <div className="flex w-full items-center gap-2 px-3 pt-2.5">
          <button onClick={leave} disabled={phase === 'run'} className="glass rounded-full px-4 py-2 text-sm disabled:opacity-50">
            ← 返回
          </button>
          <div className="glass ml-auto rounded-full px-3.5 py-2 text-sm font-semibold">🪙 {claw.coins}</div>
          <div className="glass rounded-full px-3.5 py-2 text-sm">🧸 {Object.values(claw.collection).reduce((a, b) => a + (b ?? 0), 0)}</div>
        </div>
      </div>

      {/* 机器 */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-3">
        <div className="w-[min(92vw,calc((100dvh-300px)*0.75),440px)] rounded-[32px] bg-gradient-to-b from-pink-400 via-rose-400 to-fuchsia-500 p-2.5 shadow-[0_20px_50px_-15px_rgba(236,72,153,0.6)]">
          {/* 招牌 + 跑马灯（只动 opacity） */}
          <div className="mb-2 flex items-center justify-between rounded-2xl bg-[#2a1238] px-3 py-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2 animate-blink rounded-full bg-amber-300" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
            <span className="text-sm font-black tracking-widest text-amber-200">小鸡抓抓乐</span>
            {[3, 4, 5].map((i) => (
              <span key={i} className="size-2 animate-blink rounded-full bg-amber-300" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>

          {/* 玻璃箱 */}
          <div ref={box} className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-b from-[#bfe3ff] via-[#d9d2ff] to-[#ffd6ea]">
            {/* 玻璃反光（静态） */}
            <div className="pointer-events-none absolute -inset-y-4 left-[18%] z-30 w-[16%] -skew-x-12 bg-white/25" />
            {/* 地台 + 出口 */}
            <div className="absolute inset-x-0 bottom-0 h-[14%] bg-gradient-to-b from-[#ffb3d1] to-[#f48fb8]" />
            <div className="absolute bottom-0 left-0 z-20 flex h-[30%] w-[19%] items-start justify-center rounded-tr-2xl bg-[#3a1a4a]/85 pt-2 text-[10px] font-bold text-pink-200">
              出口
            </div>

            {/* 娃娃堆 */}
            {pile.map((p) => (
              <div
                key={p.key}
                ref={(el) => {
                  if (el) plushEls.current.set(p.key, el)
                  else plushEls.current.delete(p.key)
                }}
                className="absolute top-0 left-0 z-10 w-[20%]"
                style={{ transform: size.current.w ? baseTransform(p) : undefined }}
              >
                <img src={plushUrl(p.id)} alt="" decoding="async" draggable={false} className="aspect-square w-full object-contain" />
              </div>
            ))}

            {/* 吊绳（scaleY 拉长）+ 夹子 */}
            <div ref={ropeEl} className="absolute top-0 left-0 z-20 h-px w-[2px] origin-top -translate-x-1/2 bg-slate-500 will-change-transform" />
            <div ref={clawEl} className="absolute top-0 left-0 z-20 w-[18%] will-change-transform">
              <ClawHead closed={closed} />
            </div>
          </div>
        </div>
      </div>

      {/* 电子姬 + 放下 */}
      <div className="relative px-safe pb-[max(var(--safe-bottom),16px)]">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4">
          <div className="size-14 shrink-0 overflow-hidden rounded-full border-2 border-pink-300 bg-pink-100">
            <img src={spriteUrl(talk.face)} alt="" className="h-[300%] w-full max-w-none object-cover object-[50%_6%]" />
          </div>
          <div className="glass min-w-0 flex-1 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-snug">{withCall(talk.text, call)}</div>
        </div>
        <div className="mx-auto mt-3 max-w-md px-4">
          <button
            onClick={play}
            disabled={phase !== 'ready' || claw.coins <= 0}
            className="w-full rounded-full bg-gradient-to-b from-amber-300 to-orange-400 py-4 text-lg font-black tracking-widest text-[#5a2a0a] shadow-[0_6px_0_#c2410c] transition-transform active:translate-y-1 active:shadow-[0_2px_0_#c2410c] disabled:from-slate-400 disabled:to-slate-500 disabled:text-white/70 disabled:shadow-[0_6px_0_#475569]"
          >
            {claw.coins <= 0 ? '没有硬币了' : phase === 'ready' ? '放下！' : '……'}
          </button>
          <p className="mt-2 text-center text-[11px] text-white/50">每局 1 枚硬币 · 夹子摆到娃娃正上方再按</p>
        </div>
      </div>

      {/* 抓到了 */}
      {phase === 'won' && won && (
        <div className="absolute inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-xs rounded-3xl bg-white p-5 text-center text-[#4a2f2a] shadow-2xl">
            <div className={`mx-auto mb-1 w-fit rounded-full px-3 py-0.5 text-xs font-bold ${won.rarity === 'gold' ? 'bg-amber-300 text-amber-900' : won.rarity === 'rare' ? 'bg-violet-200 text-violet-800' : 'bg-pink-100 text-pink-700'}`}>
              {RARITY_LABEL[won.rarity]}
            </div>
            <img src={plushUrl(won.id)} alt="" className="mx-auto size-36 animate-pop object-contain" />
            <div className="mt-1 text-lg font-bold">抓到了「{plushName(won.id)}」！</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={gift} disabled={busy} className="rounded-full bg-gradient-to-br from-pink-400 to-rose-400 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                送给电子姬
              </button>
              <button onClick={again} className="rounded-full border border-pink-200 py-2.5 text-sm font-semibold text-[#9a7b72]">
                {claw.coins > 0 ? '再来一次' : '收好'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 离开时：要不要告诉她 */}
      {asking && (
        <div className="absolute inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/50 px-safe pb-[max(var(--safe-bottom),16px)]">
          <div className="mx-4 w-full max-w-md rounded-3xl bg-white p-5 text-[#4a2f2a]">
            <div className="text-base font-bold">回去跟电子姬说说战绩？</div>
            <p className="mt-1 text-sm text-[#9a7b72]">
              玩了 {session.plays} 局，{session.got.length ? `抓到了${session.got.map(plushName).join('、')}` : '一只都没抓到'}
            </p>
            <p className="mt-3 rounded-full bg-amber-50 px-3 py-1.5 text-center text-xs font-medium text-amber-700">⚡ 告诉她算一轮对话，会消耗能量</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={report} className="rounded-full bg-gradient-to-br from-pink-400 to-rose-400 py-2.5 text-sm font-semibold text-white">
                告诉她
              </button>
              <button onClick={() => onLeave(null)} className="rounded-full border border-pink-200 py-2.5 text-sm font-semibold text-[#9a7b72]">
                不用了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** 夹子：SVG 画的金属爪（矢量清晰、零体积）。closed 时两边爪子往里收（CSS transition，只动 transform） */
function ClawHead({ closed }: { closed: boolean }) {
  const arm = 'origin-[50%_10%] transition-transform duration-200'
  return (
    <svg viewBox="0 0 100 90" className="-translate-x-1/2 overflow-visible">
      <rect x="38" y="0" width="24" height="16" rx="5" fill="#94a3b8" stroke="#475569" strokeWidth="3" />
      <circle cx="50" cy="20" r="9" fill="#f472b6" stroke="#be185d" strokeWidth="3" />
      <g className={arm} style={{ transform: closed ? 'rotate(-14deg)' : 'rotate(12deg)' }}>
        <path d="M44 22 L22 52 L32 80" fill="none" stroke="#64748b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className={arm} style={{ transform: closed ? 'rotate(14deg)' : 'rotate(-12deg)' }}>
        <path d="M56 22 L78 52 L68 80" fill="none" stroke="#64748b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
