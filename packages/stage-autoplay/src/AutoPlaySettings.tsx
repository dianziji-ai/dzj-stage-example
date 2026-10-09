import { useId, type CSSProperties } from 'react'
import { delayFor, LIMITS } from './core'
import { autoPlayStore, type AutoPlayStore } from './store'
import { useAutoPlayPrefs } from './useAutoPlayPrefs'

/** 预览用的一句：30 个字 */
const SAMPLE = '这是一句三十个字左右的台词，用来估算自动播放时每句大概要停留多久。'

const sec = (ms: number) => `${(ms / 1000).toFixed(1)} 秒`
/** 滑杆已选部分占多少（给轨道的渐变用） */
const pct = (v: number, lim: { min: number; max: number }) => ({ '--dzj-ap-pct': `${((v - lim.min) / (lim.max - lim.min)) * 100}%` }) as CSSProperties

/**
 * 自动播放的设置：开关 + 「每字停留」「句末停顿」两条滑杆 + 一行预览（这样一句要停多久）。
 * 放哪由舞台决定（菜单、设置页、弹窗里都行）；配色走 CSS 变量（styles.css）。
 */
export default function AutoPlaySettings({ store = autoPlayStore, className = '' }: { store?: AutoPlayStore; className?: string }) {
  const [prefs, set] = useAutoPlayPrefs(store)
  const id = useId()
  return (
    <div className={`dzj-ap-settings ${className}`}>
      <label className="dzj-ap-row dzj-ap-switch">
        <span>自动播放</span>
        <input type="checkbox" role="switch" checked={prefs.on} onChange={(e) => set({ on: e.target.checked })} />
      </label>
      <div className="dzj-ap-row">
        <label htmlFor={`${id}-c`}>每字停留</label>
        <output htmlFor={`${id}-c`}>{prefs.perChar} 毫秒</output>
      </div>
      <input id={`${id}-c`} type="range" {...LIMITS.perChar} style={pct(prefs.perChar, LIMITS.perChar)} value={prefs.perChar} onChange={(e) => set({ perChar: Number(e.target.value) })} />
      <div className="dzj-ap-row">
        <label htmlFor={`${id}-p`}>句末停顿</label>
        <output htmlFor={`${id}-p`}>{sec(prefs.pause)}</output>
      </div>
      <input id={`${id}-p`} type="range" {...LIMITS.pause} style={pct(prefs.pause, LIMITS.pause)} value={prefs.pause} onChange={(e) => set({ pause: Number(e.target.value) })} />
      <p className="dzj-ap-hint">一句 30 字的台词约停 {sec(delayFor(SAMPLE, prefs))}；读到最后一句（选项出来）会停下等你选。</p>
    </div>
  )
}
