import { useId, type CSSProperties, type ReactNode } from 'react'
import { LIMITS, PACES, paceOf, VOICE_MAX_LINE, VOICE_MAX_TURN, type ChoiceMode, type FontSize, type Pace, type TextSpeed } from './core'
import { settingsStore, type SettingsStore } from './store'
import { useSettings } from './useSettings'

/** 面板分哪几节（舞台不支持的可以不显示，比如没有选项的舞台去掉 choice）。
 *  ★voice（配音）、sfx（音效）不在默认里：只有接了 @dianziji/stage-voice / stage-sfx 的舞台才有，要自己在 sections 里写上 */
export type SettingsSection = 'text' | 'font' | 'motion' | 'choice' | 'auto' | 'voice' | 'sfx'
const ALL: SettingsSection[] = ['text', 'font', 'motion', 'choice', 'auto']

const TEXT: [TextSpeed, string][] = [['slow', '慢'], ['normal', '标准'], ['fast', '快'], ['instant', '瞬间']]
const FONT: [FontSize, string][] = [['small', '小'], ['normal', '标准'], ['large', '大']]
const CHOICE: [ChoiceMode, string][] = [['fill', '填入确认'], ['send', '直接发送']]
const PACE: [Pace, string][] = [['slow', '慢'], ['normal', '标准'], ['fast', '快']]
const MAX_LINE = VOICE_MAX_LINE.map((n) => [String(n), `${n} 字`] as [string, string])
const MAX_TURN = VOICE_MAX_TURN.map((n) => [String(n), n ? `${n} 字` : '不限'] as [string, string])

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

/** 一行开关 */
function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="dzj-ap-row dzj-ap-switch">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
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
 * 播放设置面板（0.2.0 简化：能一个开关说清的不给分段，能一档说清的不给滑杆）：
 *   阅读（文本速度 · 字号 ·「减少动画」开关）· 选项行为 · 自动播放（开关 +「翻页节奏」慢/标准/快；开着配音时节奏不显示）
 *   · 配音（开关；开了才出音量 + 一句 / 一轮最多念）· 音效（开关，开了才出音量）。
 * 放哪由舞台决定（标题栏「调节」点开的浮层、菜单、设置页都行）；sections 选显示哪几节；配色走 CSS 变量（styles.css）。
 */
export default function SettingsPanel({ store = settingsStore, sections = ALL, className = '' }: { store?: SettingsStore; sections?: SettingsSection[]; className?: string }) {
  const [s, set] = useSettings(store)
  const id = useId()
  const has = (x: SettingsSection) => sections.includes(x)
  const a = s.autoPlay
  const voiceOn = has('voice') && s.voice.on
  return (
    <div className={`dzj-ap-settings dzj-st ${className}`}>
      {(has('text') || has('font') || has('motion')) && (
        <Group title="阅读">
          {has('text') && <Segmented label="文本速度" value={s.textSpeed} options={TEXT} onChange={(textSpeed) => set({ textSpeed })} />}
          {has('font') && <Segmented label="字号" value={s.fontSize} options={FONT} onChange={(fontSize) => set({ fontSize })} />}
          {has('motion') && <Switch label="减少动画" checked={s.motion === 'reduced'} onChange={(v) => set({ motion: v ? 'reduced' : 'full' })} />}
        </Group>
      )}
      {has('choice') && (
        <Group title="选项">
          <Segmented label="点选项" hint={s.choiceMode === 'fill' ? '填进输入框，确认后再发；连点几个会按顺序叠起来' : '点了直接发出去'} value={s.choiceMode} options={CHOICE} onChange={(choiceMode) => set({ choiceMode })} />
        </Group>
      )}
      {has('auto') && (
        <Group title="自动播放">
          <Switch label="自动翻到下一句" checked={a.on} onChange={(on) => set({ autoPlay: { on } })} />
          {/* 开着配音：要念的句子念完就翻，节奏用不上——不显示，免得玩家以为两样打架 */}
          {a.on && voiceOn ? (
            <p className="dzj-ap-hint">开着配音：她念完这句就翻下一句。</p>
          ) : (
            a.on && <Segmented label="翻页节奏" value={paceOf(a)} options={PACE} onChange={(p) => set({ autoPlay: PACES[p] })} />
          )}
        </Group>
      )}
      {has('voice') && (
        <Group title="配音">
          <Switch label="角色台词念出来" checked={s.voice.on} onChange={(on) => set({ voice: { on } })} />
          {s.voice.on && (
            <>
              <div className="dzj-ap-row">
                <label htmlFor={`${id}-v`}>音量</label>
                <output htmlFor={`${id}-v`}>{s.voice.volume}%</output>
              </div>
              <input id={`${id}-v`} type="range" {...LIMITS.volume} style={pct(s.voice.volume, LIMITS.volume)} value={s.voice.volume} onChange={(e) => set({ voice: { volume: Number(e.target.value) } })} />
              <Segmented label="一句最多念" hint="超过的那句不念" value={String(s.voice.maxLine)} options={MAX_LINE} onChange={(v) => set({ voice: { maxLine: Number(v) } })} />
              <Segmented label="一轮最多念" hint="这一轮念够了，后面的不念" value={String(s.voice.maxTurn)} options={MAX_TURN} onChange={(v) => set({ voice: { maxTurn: Number(v) } })} />
            </>
          )}
          <p className="dzj-ap-hint">按字数扣能量，同一句重听不扣。</p>
        </Group>
      )}
      {has('sfx') && (
        <Group title="音效">
          <Switch label="按钮和操作的音效" checked={s.sfx.on} onChange={(on) => set({ sfx: { on } })} />
          {s.sfx.on && (
            <>
              <div className="dzj-ap-row">
                <label htmlFor={`${id}-x`}>音量</label>
                <output htmlFor={`${id}-x`}>{s.sfx.volume}%</output>
              </div>
              <input id={`${id}-x`} type="range" {...LIMITS.volume} style={pct(s.sfx.volume, LIMITS.volume)} value={s.sfx.volume} onChange={(e) => set({ sfx: { volume: Number(e.target.value) } })} />
            </>
          )}
        </Group>
      )}
    </div>
  )
}
