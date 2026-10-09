import { settingsStore, type SettingsStore } from '@dianziji/stage-settings'
import { createBus, render, type SfxName } from './synth'

/**
 * 播放器：一个 AudioContext + 一条总线（第一次出声时才建，浏览器要求先有用户操作）。
 * 音量＝玩家设置（stage-settings 的 sfx）× 配音时压低（duck）；关着、页面在后台都不响；任何失败安静吞掉。
 */
let bus: ReturnType<typeof createBus> | null = null
let store: SettingsStore = settingsStore
let ducked = false
let lastAt: Partial<Record<SfxName, number>> = {}

/** 同一个声音最短间隔（毫秒）：悬停划过一排按钮不会响成一串 */
const GAP: Partial<Record<SfxName, number>> = { hover: 70, page: 90 }

export function setStore(s: SettingsStore) {
  store = s
}

/** 配音在念的时候压低一半（舞台在 voice.playing 变化时调） */
export function duck(on: boolean) {
  ducked = on
  apply()
}

function apply() {
  if (!bus) return
  const s = store.get().sfx
  bus.input.gain.value = (s.volume / 100) * (ducked ? 0.5 : 1) * 1.6
}

/** 放一个声音 */
export function sfx(name: SfxName) {
  try {
    const s = store.get().sfx
    if (!s.on || s.volume <= 0) return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    const now = performance.now()
    if (GAP[name] && now - (lastAt[name] ?? -1e9) < GAP[name]!) return
    lastAt[name] = now
    if (!bus) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      bus = createBus(new AC())
    }
    if (bus.ctx.state === 'suspended') void bus.ctx.resume().catch(() => {})
    apply()
    render(bus, name)
  } catch {
    /* 没声卡 / 被浏览器拦了：安静失败 */
  }
}

/** 测试用：清掉状态 */
export function resetForTest() {
  bus = null
  ducked = false
  lastAt = {}
  store = settingsStore
}
