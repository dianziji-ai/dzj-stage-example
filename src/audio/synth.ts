/**
 * 8-bit 合成器。
 * ★性能：一首曲子用 OfflineAudioContext 一次性渲染成 AudioBuffer（在音频线程跑，几十毫秒），
 *   之后交给浏览器原生循环播放——播放期间 JS 零参与，没有定时器、不逐拍调度。
 *   单声道 22.05kHz：8 小节约 2MB 内存。
 */
import { cells, noteFreq, type Song, type Voice } from './songs'

const RATE = 22050

/** 方波占空比：25% 是 FC 主旋律音色，12.5% 更细更亮（分解和弦） */
function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  const n = 32
  const real = new Float32Array(n)
  const imag = new Float32Array(n)
  for (let k = 1; k < n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty)
  return ctx.createPeriodicWave(real, imag)
}

const VOICE: Record<Voice, { gain: number; duty?: number; type?: OscillatorType }> = {
  lead: { gain: 0.16, duty: 0.25 },
  arp: { gain: 0.06, duty: 0.125 },
  bass: { gain: 0.22, type: 'triangle' },
}

/** 把一首曲子渲染成一段可以无缝循环的音频 */
export async function renderSong(song: Song): Promise<AudioBuffer> {
  const step = 60 / song.bpm / 2 // 八分音符时长
  const bars = song.lead.length
  const length = Math.ceil(bars * 8 * step * RATE)
  const ctx = new OfflineAudioContext(1, length, RATE)

  // 总线：轻微低通，削掉方波刺耳的高频
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 5200
  lp.connect(ctx.destination)
  const waves = { lead: pulseWave(ctx, 0.25), arp: pulseWave(ctx, 0.125) }

  for (const voice of ['lead', 'arp', 'bass'] as Voice[]) {
    const v = VOICE[voice]
    const notes = song[voice].flatMap(cells)
    notes.forEach((c, i) => {
      const f = noteFreq(c)
      if (f === null) return
      let len = 1
      while (notes[i + len] === '-') len++
      const t = i * step
      const dur = len * step
      const osc = ctx.createOscillator()
      if (v.duty) osc.setPeriodicWave(voice === 'lead' ? waves.lead : waves.arp)
      else osc.type = v.type ?? 'square'
      osc.frequency.value = f
      const g = ctx.createGain()
      // 包络：5ms 起音 → 衰减到 70% → 尾部 40ms 收掉（防「咔哒」声）
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(v.gain, t + 0.005)
      g.gain.linearRampToValueAtTime(v.gain * 0.7, t + Math.min(0.12, dur * 0.5))
      g.gain.setValueAtTime(v.gain * 0.7, t + dur - 0.04)
      g.gain.linearRampToValueAtTime(0, t + dur - 0.002)
      osc.connect(g).connect(lp)
      osc.start(t)
      osc.stop(t + dur)
    })
  }

  if (song.drums) {
    const noise = noiseBuffer(ctx)
    song.drums.flatMap(cells).forEach((c, i) => {
      const t = i * step
      if (c === 'k') kick(ctx, lp, t)
      else if (c === 's') hit(ctx, lp, noise, t, 'bandpass', 1800, 0.18, 0.12)
      else if (c === 'h') hit(ctx, lp, noise, t, 'highpass', 6000, 0.05, 0.04)
    })
  }

  return ctx.startRendering()
}

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

function kick(ctx: BaseAudioContext, out: AudioNode, t: number) {
  const o = ctx.createOscillator()
  o.frequency.setValueAtTime(150, t)
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.35, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.15)
}

function hit(ctx: BaseAudioContext, out: AudioNode, noise: AudioBuffer, t: number, type: BiquadFilterType, freq: number, gain: number, dur: number) {
  const s = ctx.createBufferSource()
  s.buffer = noise
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  s.connect(f).connect(g).connect(out)
  s.start(t)
  s.stop(t + dur)
}

export type SfxId = 'drop' | 'grab' | 'win' | 'gold' | 'miss' | 'tap'

/** 短音效：现场合成（几个振荡器，几百毫秒就结束，没有常驻开销） */
export function playSfx(ctx: AudioContext, out: AudioNode, id: SfxId) {
  const t = ctx.currentTime + 0.01
  const tone = (f: number, at: number, dur: number, gain = 0.12, type: OscillatorType = 'square', slideTo?: number) => {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f, t + at)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + at + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t + at)
    g.gain.exponentialRampToValueAtTime(0.001, t + at + dur)
    o.connect(g).connect(out)
    o.start(t + at)
    o.stop(t + at + dur + 0.02)
  }
  if (id === 'tap') tone(880, 0, 0.05, 0.06)
  else if (id === 'drop') tone(660, 0, 0.5, 0.07, 'triangle', 220)
  else if (id === 'grab') tone(220, 0, 0.08, 0.12, 'square', 120)
  else if (id === 'miss') [523, 392].forEach((f, i) => tone(f, i * 0.12, 0.14, 0.08))
  else if (id === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.14, 0.09))
  else if (id === 'gold') [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.07, i === 5 ? 0.4 : 0.12, 0.1))
}
