import { useId, type CSSProperties, type ReactNode } from 'react'
import { delayFor, LIMITS, type ChoiceMode, type FontSize, type Motion, type TextSpeed } from './core'
import { settingsStore, type SettingsStore } from './store'
import { useSettings } from './useSettings'

/** 面板分哪几节（舞台不支持的可以不显示，比如没有选项的舞台去掉 choice） */
export type SettingsSection = 'text' | 'font' | 'motion' | 'choice' | 'auto'
const ALL: SettingsSection[] = ['text', 'font', 'motion', 'choice', 'auto']

const TEXT: [TextSpeed, string][] = [['slow', '慢'], ['normal', '标准'], ['fast', '快'], ['instant', '瞬间']]
const FONT: [FontSize, string][] = [['small', '小'], ['normal', '标准'], ['large', '大']]
const MOTION: [Motion, string][] = [['full', '标准'], ['reduced', '减少']]
const CHOICE: [ChoiceMode, string][] = [['fill', '填入确认'], ['send', '直接发送']]

/** 预览用的一句：30 个字 */
const SAMPLE = '这是一句三十个字左右的台词，用来估算自动播放时每句大概要停留多久。'
const sec = (ms: number) => `${(ms / 1000).toFixed(1)} 秒`
/** 滑杆已选部分占多少（给轨道的渐变用） */
const pct = (v: number, lim: { min: number; max: number }) => ({ '--dzj-ap-pct': `${((v - lim.min) / (lim.max - lim.min)) * 100}%` }) as CSSProperties

/** 一行分段选择（单选） */
function Segmented<T extends string>({ label, hint, value, options, onChange }: { label: string; hint?: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="dzj-st-item">
      <div className="dzj-st-head">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div className="dzj-st-seg" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="dzj-st-group">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

/**
 * 播放设置面板：文本速度 · 字号 · 动效 · 选项行为 · 自动播放（开关 + 每字停留 / 句末停顿 + 预览）。
 * 放哪由舞台决定（标题栏「调节」点开的浮层、菜单、设置页都行）；sections 选显示哪几节；配色走 CSS 变量（styles.css）。
 */
export default function SettingsPanel({ store = settingsStore, sections = ALL, className = '' }: { store?: SettingsStore; sections?: SettingsSection[]; className?: string }) {
  const [s, set] = useSettings(store)
  const id = useId()
  const has = (x: SettingsSection) => sections.includes(x)
  const a = s.autoPlay
  return (
    <div className={`dzj-ap-settings dzj-st ${className}`}>
      {(has('text') || has('font') || has('motion')) && (
        <Group title="阅读">
          {has('text') && <Segmented label="文本速度" value={s.textSpeed} options={TEXT} onChange={(textSpeed) => set({ textSpeed })} />}
          {has('font') && <Segmented label="字号" value={s.fontSize} options={FONT} onChange={(fontSize) => set({ fontSize })} />}
          {has('motion') && <Segmented label="动效" hint="减少＝关掉淡入、浮动这些动画" value={s.motion} options={MOTION} onChange={(motion) => set({ motion })} />}
        </Group>
      )}
      {has('choice') && (
        <Group title="选项">
          <Segmented label="点选项" hint={s.choiceMode === 'fill' ? '填进输入框，确认后再发；连点几个会按顺序叠起来' : '点了直接发出去'} value={s.choiceMode} options={CHOICE} onChange={(choiceMode) => set({ choiceMode })} />
        </Group>
      )}
      {has('auto') && (
        <Group title="自动播放">
          <label className="dzj-ap-row dzj-ap-switch">
            <span>自动翻到下一句</span>
            <input type="checkbox" role="switch" checked={a.on} onChange={(e) => set({ autoPlay: { on: e.target.checked } })} />
          </label>
          <div className="dzj-ap-row">
            <label htmlFor={`${id}-c`}>每字停留</label>
            <output htmlFor={`${id}-c`}>{a.perChar} 毫秒</output>
          </div>
          <input id={`${id}-c`} type="range" {...LIMITS.perChar} style={pct(a.perChar, LIMITS.perChar)} value={a.perChar} onChange={(e) => set({ autoPlay: { perChar: Number(e.target.value) } })} />
          <div className="dzj-ap-row">
            <label htmlFor={`${id}-p`}>句末停顿</label>
            <output htmlFor={`${id}-p`}>{sec(a.pause)}</output>
          </div>
          <input id={`${id}-p`} type="range" {...LIMITS.pause} style={pct(a.pause, LIMITS.pause)} value={a.pause} onChange={(e) => set({ autoPlay: { pause: Number(e.target.value) } })} />
          <p className="dzj-ap-hint">字打完后，一句 30 字的台词约停 {sec(delayFor(SAMPLE, a))}；读到最后一句（选项出来）会停下等你选。</p>
        </Group>
      )}
    </div>
  )
}
