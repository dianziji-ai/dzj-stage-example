import { useEffect, useRef } from 'react'
import { favorStage } from './logic'
import s from './FavorBurst.module.css'

/**
 * 好感变了：画面正中一段约 2.5 秒的演出，然后消失（不挡点击）。照《妈妈柳月儿》舞台，配色换成电子姬的粉 + 小鸡黄。
 *   涨：粉色渐变的大心 + 光晕 + 几颗黄色小心往上飘散；降：灰蓝的心带一道裂痕、往下沉。
 *   心下「好感 +2」，一条细进度条从变化前滑到变化后（旁边是此刻的阶段名），最下一行小字是原因。
 * key＝第几次结算：每次结算重播；没变不出。只动 transform / opacity。
 */
/** 一次结算的好感变化：delta＝变了多少（没变＝0 不演），reason＝状态区写的原因，n＝第几次结算（当 key 重播） */
export type FavorTick = { delta: number; reason: string; n: number }

export default function FavorBurst({ tick, favor }: { tick: FavorTick; favor: number }) {
  if (!tick.delta) return null
  return <Burst key={tick.n} delta={tick.delta} reason={tick.reason} favor={favor} />
}

function Burst({ delta, reason, favor }: { delta: number; reason: string; favor: number }) {
  const up = delta > 0
  const from = Math.max(0, Math.min(100, favor - delta))
  const bar = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    bar.current?.animate([{ transform: `scaleX(${from / 100})` }, { transform: `scaleX(${favor / 100})` }], {
      duration: 900,
      delay: 450,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      fill: 'both',
    })
  }, [from, favor])
  return (
    <div className={s.root} aria-live="polite">
      <div className={`${s.card} ${up ? s.up : s.down}`}>
        <span className={s.glow} aria-hidden />
        <span className={s.heartWrap} aria-hidden>
          <svg viewBox="0 0 64 58" className={s.heart}>
            <defs>
              <linearGradient id="fb-up" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffd6e7" />
                <stop offset="0.55" stopColor="#ff5fa2" />
                <stop offset="1" stopColor="#d6337a" />
              </linearGradient>
              <linearGradient id="fb-down" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#c9d6e8" />
                <stop offset="1" stopColor="#6d7f99" />
              </linearGradient>
            </defs>
            <path
              d="M32 56 C 14 42 2 31 2 17.5 C 2 8.5 9 2 17.5 2 C 23.5 2 28.5 5.5 32 10.5 C 35.5 5.5 40.5 2 46.5 2 C 55 2 62 8.5 62 17.5 C 62 31 50 42 32 56 Z"
              fill={up ? 'url(#fb-up)' : 'url(#fb-down)'}
            />
            <path d="M14 10 C 10 12.5 8.5 16 9 19.5" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.6" strokeLinecap="round" />
            {!up && <path d="M33 11 L 28 22 L 35 28 L 29 40" fill="none" stroke="#1d2433" strokeOpacity="0.75" strokeWidth="2.2" strokeLinejoin="round" />}
          </svg>
          {up && [0, 1, 2, 3, 4, 5].map((i) => <i key={i} className={s.spark} style={{ ['--i' as string]: i }} />)}
        </span>
        <span className={s.label}>
          好感<b>{up ? `+${delta}` : delta}</b>
        </span>
        <span className={s.meter}>
          <span className={s.track}>
            <span ref={bar} className={s.fill} style={{ transform: `scaleX(${from / 100})` }} />
          </span>
          <span className={s.stage}>
            {favor} · {favorStage(favor).name}
          </span>
        </span>
        {reason && <span className={s.reason}>{reason}</span>}
      </div>
    </div>
  )
}
