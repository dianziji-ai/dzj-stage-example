import { useEffect, useRef } from 'react'
import mascot from './mascot-hop.webp'

/**
 * 启动加载页：看板娘蹦蹦跳（站内同款 mascot-hop.webp）+ 进度条 + 当前步骤 + 一句小贴士。
 * ★轻量：光晕是静态径向渐变（不用 blur），进度条 scaleX，地面阴影只动 transform；手机首屏零负担。
 * error 时换成出错卡片 + 重试。
 */
const TIPS = ['电子姬正在梳头发…', '小鸡帽戴好了吗？', '正在把舞台灯打开～', '今天也要开开心心哦']
const TIP = TIPS[Math.floor(Math.random() * TIPS.length)]

export default function Splash({ step, progress, error, onRetry, leaving }: {
  /** 当前在干嘛（「读取存档…」） */
  step: string
  /** 0–1 */
  progress: number
  error?: { title: string; detail: string } | null
  onRetry?: () => void
  /** 准备好了、正在淡出 */
  leaving?: boolean
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[radial-gradient(60%_45%_at_50%_42%,#ffe3ef_0%,transparent_70%),radial-gradient(80%_60%_at_50%_100%,#fff1c7_0%,transparent_70%)] bg-[#fff8f1] px-8 text-[#4a2f2a] transition-opacity duration-500 ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      {error ? (
        <div className="w-full max-w-xs text-center">
          <img src={mascot} alt="" className="mx-auto h-28 w-auto opacity-60 grayscale" />
          <div className="mt-3 text-lg font-bold">{error.title}</div>
          <p className="mt-1 text-sm leading-6 text-[#9a7b72]">{error.detail}</p>
          {onRetry && (
            <button onClick={onRetry} className="mt-5 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 px-8 py-2.5 text-sm font-semibold text-white shadow-md">
              重试
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="relative flex flex-col items-center">
            <img src={mascot} alt="" draggable={false} className="h-36 w-auto" />
            {/* 地面阴影：跟着蹦的节奏缩放（只动 transform） */}
            <span className="-mt-2 h-2.5 w-16 animate-[boot-shadow_0.9s_ease-in-out_infinite] rounded-[50%] bg-[#e8a04c]/30" />
          </div>
          <div className="mt-6 w-56 max-w-full">
            <Bar progress={progress} done={!!leaving} />
            <div className="mt-2 text-center text-xs text-[#9a7b72]">{step}</div>
          </div>
          <p className="absolute inset-x-0 bottom-0 pb-[max(var(--safe-bottom),24px)] text-center text-xs text-[#c2a59c]">✦ {TIP} ✦</p>
        </>
      )}
    </div>
  )
}

/**
 * 进度条：不是在几个步骤之间干跳——
 *   ① 到一步：0.35 秒走到这一步的位置；② 等下一步的时候：往剩下的一半慢慢爬（越爬越慢，自己永远爬不满）；
 *   ③ 下一步到了从**当前位置**接着走，不往回跳。再加一道一直在扫的流光，等多久都看得出在动。
 * ★性能：只动 transform（Web Animations，合成层跑），不触发排版；不用 React 每帧重渲染。
 */
function Bar({ progress, done }: { progress: number; done: boolean }) {
  const fill = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = fill.current
    if (!el || typeof el.animate !== 'function') return // 老浏览器 / 测试环境没有 Web Animations：进度条就停在初始宽度，不报错
    const target = Math.max(0.04, Math.min(1, progress))
    const now = currentScale(el)
    el.getAnimations().forEach((a) => a.cancel())
    const to = (v: number) => ({ transform: `scaleX(${v})` })
    if (done || target >= 1) {
      el.animate([to(now), to(1)], { duration: 300, easing: 'ease-out', fill: 'forwards' })
      return
    }
    const step = el.animate([to(now), to(Math.max(now, target))], { duration: 350, easing: 'ease-out', fill: 'forwards' })
    let creep: Animation | null = null
    step.onfinish = () => {
      const from = currentScale(el)
      creep = el.animate([to(from), to(from + (1 - from) * 0.5)], { duration: 8000, easing: 'cubic-bezier(0.1, 0.6, 0.3, 1)', fill: 'forwards' })
    }
    return () => {
      step.onfinish = null
      creep?.pause()
    }
  }, [progress, done])

  return (
    <div className="h-2 overflow-hidden rounded-full bg-pink-100">
      <div ref={fill} className="relative h-full origin-left overflow-hidden rounded-full bg-gradient-to-r from-amber-300 via-pink-400 to-rose-400" style={{ transform: 'scaleX(0.04)' }}>
        <span className="absolute inset-y-0 left-0 w-1/2 animate-[boot-shine_1.3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:hidden" />
      </div>
    </div>
  )
}

/** 当前画在屏幕上的 scaleX（动画进行中也准：读计算后的 transform 矩阵） */
function currentScale(el: HTMLElement): number {
  const m = getComputedStyle(el).transform
  if (!m || m === 'none') return 0.04
  const a = Number(m.slice(m.indexOf('(') + 1).split(',')[0])
  return Number.isFinite(a) ? a : 0.04
}
