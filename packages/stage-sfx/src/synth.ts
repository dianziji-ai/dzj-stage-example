/**
 * 声音怎么合成（只有 WebAudio，零音频文件）。目标：轻、短、圆润，像高级 galgame 的界面声，不抢配音。
 *
 * 一条总线：每个声音 → 总音量（玩家设置 × 配音时压低）→ 柔化低通 → 一点点「房间感」（合成的短混响，湿声很少）→ 扬声器。
 * 乐音用「钟片」做：正弦基音 + 一个很轻的高泛音（×3.98，略失谐像木琴 / 玻璃），指数衰减（悬停除外：纯正弦轻触，见 soft）；
 * 每次随机偏一点点音高（±1.5%），连点几十下也不腻耳。
 */

export type SfxName = 'hover' | 'click' | 'confirm' | 'cancel' | 'open' | 'on' | 'off' | 'page' | 'error'

type Bus = { ctx: AudioContext; input: GainNode }

/** 合成一段短混响的冲激响应：0.5 秒、衰减很快的立体声噪声（只做一次） */
function roomImpulse(ctx: AudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 0.5)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
  }
  return buf
}

/** 总线：input → 柔化低通 → (干声 + 少量混响) → 扬声器 */
export function createBus(ctx: AudioContext): Bus {
  const input = ctx.createGain()
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 7000
  tone.Q.value = 0.5
  const dry = ctx.createGain()
  dry.gain.value = 1
  const wet = ctx.createGain()
  wet.gain.value = 0.14
  const verb = ctx.createConvolver()
  verb.buffer = roomImpulse(ctx)
  input.connect(tone)
  tone.connect(dry).connect(ctx.destination)
  tone.connect(verb).connect(wet).connect(ctx.destination)
  return { ctx, input }
}

const jitter = () => 1 + (Math.random() - 0.5) * 0.03

/** 一个钟片音：f＝基音，at＝开始时间，len＝衰减长度，peak＝音量 */
function chime(b: Bus, f: number, at: number, len: number, peak: number) {
  const { ctx } = b
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  g.connect(b.input)
  const o1 = ctx.createOscillator()
  o1.type = 'sine'
  o1.frequency.value = f
  o1.connect(g)
  // 高泛音：音量低、衰减更快，给一点玻璃 / 木琴的「亮」
  const g2 = ctx.createGain()
  g2.gain.setValueAtTime(0.0001, at)
  g2.gain.exponentialRampToValueAtTime(peak * 0.22, at + 0.004)
  g2.gain.exponentialRampToValueAtTime(0.0001, at + len * 0.45)
  g2.connect(b.input)
  const o2 = ctx.createOscillator()
  o2.type = 'sine'
  o2.frequency.value = f * 3.98
  o2.connect(g2)
  for (const o of [o1, o2]) {
    o.start(at)
    o.stop(at + len + 0.05)
  }
}

/**
 * 悬停：柔和的「轻触」——只有一个正弦，从 C6 往下滑一点，起音稍慢、很短很轻，再单独过一道低通。
 * ★别加高泛音：2026-10-09 第一版用 2349Hz 钟片（泛音到 9kHz）被站长嫌「太难听」，刺耳。
 */
function soft(b: Bus, at: number, j: number) {
  const { ctx } = b
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(1046.5 * j, at)
  o.frequency.exponentialRampToValueAtTime(880 * j, at + 0.05)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2200
  lp.Q.value = 0.3
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(0.022, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07)
  o.connect(lp).connect(g).connect(b.input)
  o.start(at)
  o.stop(at + 0.09)
}

/** 一记滑音（pop / 开关）：从 f0 滑到 f1 */
function blip(b: Bus, type: OscillatorType, f0: number, f1: number, at: number, len: number, peak: number) {
  const { ctx } = b
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f0, at)
  o.frequency.exponentialRampToValueAtTime(f1, at + len * 0.7)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  o.connect(g).connect(b.input)
  o.start(at)
  o.stop(at + len + 0.03)
}

/** 一段过了滤波的噪声（纸页、点击的「沙」） */
function noise(b: Bus, at: number, len: number, peak: number, freq: number, q: number, rise = 0.01) {
  const { ctx } = b
  const n = Math.floor(ctx.sampleRate * (len + 0.02))
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + rise)
  g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  src.connect(f).connect(g).connect(b.input)
  src.start(at)
  src.stop(at + len + 0.02)
}

/** 每个声音的配方（时间从 now 起算） */
export function render(b: Bus, name: SfxName) {
  const t = b.ctx.currentTime + 0.005
  const j = jitter()
  switch (name) {
    case 'hover':
      return soft(b, t, j)
    case 'click':
      // 木质「嗒」：三角波快速下滑 + 一丝高频沙声当触感
      blip(b, 'triangle', 640 * j, 220, t, 0.085, 0.12)
      return noise(b, t, 0.025, 0.05, 4200, 1.2, 0.002)
    case 'confirm':
      // 两个音往上：E6 → B6，第二个稍长，像「叮咚」
      chime(b, 1318.5 * j, t, 0.28, 0.08)
      return chime(b, 1975.5 * j, t + 0.075, 0.42, 0.075)
    case 'cancel':
      // 两个音往下，更短更轻
      chime(b, 1568 * j, t, 0.2, 0.06)
      return chime(b, 1046.5 * j, t + 0.06, 0.28, 0.055)
    case 'open':
      // 柔和的「啵」：正弦从低往上滑 + 一个轻钟片收尾
      blip(b, 'sine', 330 * j, 760, t, 0.12, 0.11)
      return chime(b, 1760 * j, t + 0.04, 0.2, 0.03)
    case 'on':
      return blip(b, 'sine', 880 * j, 1320, t, 0.08, 0.08)
    case 'off':
      return blip(b, 'sine', 1320 * j, 880, t, 0.08, 0.07)
    case 'page':
      // 纸页：带通噪声，先轻轻涌起再落下
      return noise(b, t, 0.16, 0.035, 2600 * j, 0.8, 0.05)
    case 'error':
      // 低沉两下
      blip(b, 'triangle', 247, 233, t, 0.1, 0.09)
      return blip(b, 'triangle', 247, 220, t + 0.13, 0.14, 0.08)
  }
}
