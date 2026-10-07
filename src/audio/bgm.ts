/**
 * 背景音乐 + 音效播放器（全局一个）。
 *  · 手机浏览器要用户先点一下才准出声：第一次 pointerdown 时才建 AudioContext，之前的 play() 先记着。
 *  · 换曲：新曲淡入、旧曲淡出（0.8s）；渲染好的曲子缓存起来，切回来不用重渲染。
 *  · 切后台 / 锁屏：整个 AudioContext suspend（省电），回来再 resume。
 *  · 关着音乐时不建 AudioContext、不渲染曲子（不占音频硬件、不耗电）；打开那一下（本身就是点击）再建。
 *  · 开关、音量记在本机（SDK 的 local：按卡分开、隐私模式下只在这次生效）。
 *    ★local 要连上这一局（知道卡 id）才能读，所以不在加载时读：useBgm 第一次挂载时 restore()。
 */
import { local } from '@dianziji/stage'
import { renderSong, playSfx, type SfxId } from './synth'
import { SONGS, type SongId } from './songs'

const KEY = 'bgm'
const FADE = 0.8

type Prefs = { on: boolean; volume: number }

const DEFAULT_PREFS: Prefs = { on: true, volume: 0.6 }

function loadPrefs(): Prefs {
  const p = local.getJSON<Partial<Prefs>>(KEY, {})
  return { on: p.on !== false, volume: typeof p.volume === 'number' ? Math.min(1, Math.max(0, p.volume)) : DEFAULT_PREFS.volume }
}

class Bgm {
  prefs = DEFAULT_PREFS
  private restored = false
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private cache = new Map<SongId, Promise<AudioBuffer>>()
  private current: { id: SongId; src: AudioBufferSourceNode; gain: GainNode } | null = null
  private wanted: SongId | null = null
  private listeners = new Set<() => void>()

  constructor() {
    if (typeof window === 'undefined') return
    const unlock = () => {
      window.removeEventListener('pointerdown', unlock)
      if (this.prefs.on) this.start()
    }
    window.addEventListener('pointerdown', unlock)
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return
      if (document.hidden) void this.ctx.suspend()
      else if (this.prefs.on) void this.ctx.resume()
    })
  }

  /** 读回本机记的开关 / 音量（连上这一局后调一次；之后再调不重复读） */
  restore() {
    if (this.restored) return
    this.restored = true
    this.prefs = loadPrefs()
    this.listeners.forEach((fn) => fn())
  }

  /** 订阅开关 / 音量变化（给 🎵 按钮刷新用） */
  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => void this.listeners.delete(fn)
  }

  /** 建 AudioContext 并放想放的那首（只在点击里调：浏览器要用户手势才准出声） */
  private start() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'playback' })
      this.master = this.ctx.createGain()
      this.master.gain.value = this.prefs.volume
      this.master.connect(this.ctx.destination)
    }
    void this.ctx.resume() // 有的浏览器新建出来就是 suspended
    if (this.wanted) void this.play(this.wanted)
  }

  /** 播这首（同一首在放就什么都不做）。还没解锁 / 音乐关着就先记着，解锁或打开时再放。 */
  async play(id: SongId) {
    this.wanted = id
    if (!this.ctx || !this.master || !this.prefs.on) return
    if (this.current?.id === id) return
    if (!this.cache.has(id)) this.cache.set(id, renderSong(SONGS[id]))
    const buffer = await this.cache.get(id)!
    if (this.wanted !== id || !this.ctx || !this.master || !this.prefs.on) return // 渲染期间又换了 / 关了

    const now = this.ctx.currentTime
    if (this.current) {
      const old = this.current
      old.gain.gain.cancelScheduledValues(now)
      old.gain.gain.setValueAtTime(old.gain.gain.value, now)
      old.gain.gain.linearRampToValueAtTime(0, now + FADE)
      old.src.stop(now + FADE + 0.05)
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(1, now + FADE)
    src.connect(gain).connect(this.master)
    src.start(now)
    this.current = { id, src, gain }
  }

  sfx(id: SfxId) {
    if (!this.ctx || !this.master || !this.prefs.on) return
    playSfx(this.ctx, this.master, id)
  }

  setOn(on: boolean) {
    this.prefs = { ...this.prefs, on }
    this.apply()
  }

  setVolume(volume: number) {
    this.prefs = { ...this.prefs, volume: Math.min(1, Math.max(0, volume)) }
    this.apply()
  }

  private apply() {
    local.setJSON(KEY, this.prefs)
    // 第一次打开（之前一直关着、还没建）：开关本身是点击，直接建
    if (this.prefs.on && !this.ctx) this.start()
    else if (this.ctx && this.master) {
      const now = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setValueAtTime(this.master.gain.value, now)
      this.master.gain.linearRampToValueAtTime(this.prefs.on ? this.prefs.volume : 0, now + 0.15)
      // 关掉：淡出后整个挂起（不占音频硬件、省电）；打开：恢复，关着时没放的那首补上
      if (this.prefs.on) {
        if (!document.hidden) void this.ctx.resume()
        if (this.wanted && this.current?.id !== this.wanted) void this.play(this.wanted)
      } else {
        const ctx = this.ctx
        setTimeout(() => !this.prefs.on && void ctx.suspend(), 250)
      }
    }
    this.listeners.forEach((fn) => fn())
  }
}

export const bgm = new Bgm()
