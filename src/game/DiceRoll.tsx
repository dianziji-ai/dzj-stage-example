import { useEffect, useRef } from 'react'
import type { Outcome } from './dice'
import s from './DiceRoll.module.css'

const REDUCED = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const SPARKS = Array.from({ length: 14 }, (_, i) => `${(360 / 14) * i}deg`)

/**
 * 掷骰演出（一次性，照《妈妈柳月儿》舞台）：小鸡黄的骰子从左下抛进来翻滚落桌 → 化成一枚结果徽章（点数 + 成功 / 失败）→ 成功金光 + 火花 / 失败冷灰一顿。
 * 翻滚时骰面上的数字乱跳（直接写 DOM，不让 React 每帧重画）；演完 onDone。系统开了「减少动态效果」直接出点数。
 */
export default function DiceRoll({ roll, outcome, onDone }: { roll: number; outcome: Outcome; onDone: () => void }) {
  const cube = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const faces = cube.current ? [...cube.current.children] : []
    const spin = REDUCED
      ? 0
      : window.setInterval(() => {
          for (const f of faces) f.textContent = String(1 + Math.floor(Math.random() * 100))
        }, 70)
    const stop = window.setTimeout(() => window.clearInterval(spin), 1100)
    const done = window.setTimeout(onDone, REDUCED ? 0 : 2000)
    return () => {
      window.clearInterval(spin)
      window.clearTimeout(stop)
      window.clearTimeout(done)
    }
  }, [onDone])

  const win = outcome === 'success' || outcome === 'crit'
  const tone = [s.landed, win ? s.win : s.lose, outcome === 'crit' ? s.crit : '', outcome === 'fumble' ? s.fumble : ''].join(' ')
  return (
    <div className={`${s.stage} ${tone}`} aria-live="polite" aria-label={`掷出 ${roll}`}>
      <span className={s.shadow} />
      <div className={s.toss}>
        <div ref={cube} className={s.cube}>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={s.face}>
              🐤
            </span>
          ))}
        </div>
      </div>
      <span className={s.ring} />
      {SPARKS.map((a) => (
        <span key={a} className={s.spark} style={{ '--a': a } as React.CSSProperties} />
      ))}
      <span className={s.medal}>
        <b>{roll}</b>
        <small>{outcome === 'crit' ? '大成功' : outcome === 'fumble' ? '大失败' : win ? '成功' : '失败'}</small>
      </span>
    </div>
  )
}
