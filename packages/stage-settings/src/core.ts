/**
 * 播放设置的数据和纯函数（不碰 DOM / React）。一份设置管六样：
 *   文本速度（逐字打出）· 字号 · 动效 · 选项行为 · 自动播放（开关 + 每字停留 + 句末停顿）· 配音（0.2.0，给 @dianziji/stage-voice 用）。
 * 自动播放等多久 ＝ 句末停顿 + 字数 × 每字停留，最多 MAX_DELAY_MS；字数只数要读的字（空白和标点不算）。
 */

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant'
export type FontSize = 'small' | 'normal' | 'large'
export type Motion = 'full' | 'reduced'
/** 点选项：fill＝填进输入框等玩家确认（连点几个按顺序叠加）；send＝直接发 */
export type ChoiceMode = 'fill' | 'send'
export type AutoPlay = { on: boolean; perChar: number; pause: number }
/**
 * 配音（0.2.0）：on＝角色台词自动念出来（按字数扣玩家能量，所以默认关、玩家自己开；念出错一次 stage-voice 会把它关掉）；
 * volume 0~100；maxLine＝一句超过这么多字就不念（模型写出一大段时不白扣）；maxTurn＝一轮累计超过就不再念，0＝不限。
 */
export type Voice = { on: boolean; volume: number; maxLine: number; maxTurn: number }

/** 界面音效（0.2.0，给 @dianziji/stage-sfx 用）：悬停 / 点击 / 确认这些操作的声音反馈。默认开、音量 50 */
export type Sfx = { on: boolean; volume: number }

export type Settings = { textSpeed: TextSpeed; fontSize: FontSize; motion: Motion; choiceMode: ChoiceMode; autoPlay: AutoPlay; voice: Voice; sfx: Sfx }

export const DEFAULT_SETTINGS: Settings = {
  textSpeed: 'normal',
  fontSize: 'normal',
  motion: 'full',
  choiceMode: 'fill',
  autoPlay: { on: false, perChar: 90, pause: 1500 },
  voice: { on: false, volume: 80, maxLine: 80, maxTurn: 300 },
  sfx: { on: true, volume: 50 },
}

/** 配音两个上限的可选值（设置面板的分段按钮用；读回来不在里面的夹回默认） */
export const VOICE_MAX_LINE = [40, 80, 150] as const
export const VOICE_MAX_TURN = [150, 300, 600, 0] as const

/** 每种文本速度一秒打几个字（瞬间＝Infinity，一下全出） */
export const CHARS_PER_SEC: Record<TextSpeed, number> = { slow: 14, normal: 30, fast: 70, instant: Infinity }
/** 字号：舞台把对话（和想跟着变的面板）字号乘这个系数 */
export const FONT_SCALE: Record<FontSize, number> = { small: 0.88, normal: 1, large: 1.2 }

/** 自动播放两项时间的取值范围（设置面板的滑杆也用它） */
export const LIMITS = {
  perChar: { min: 20, max: 250, step: 10 },
  pause: { min: 0, max: 5000, step: 250 },
  volume: { min: 0, max: 100, step: 5 },
} as const

/**
 * 设置面板上的「翻页节奏」三档（0.2.0 起面板不再给两条滑杆，选一档同时定每字停留和句末停顿）。
 * 读回来的不是这三档（老版本滑杆调过的）：面板按最近的一档显示，玩家点了才改。
 */
export type Pace = 'slow' | 'normal' | 'fast'
export const PACES: Record<Pace, Pick<AutoPlay, 'perChar' | 'pause'>> = {
  slow: { perChar: 130, pause: 2500 },
  normal: { perChar: 90, pause: 1500 },
  fast: { perChar: 50, pause: 800 },
}
/** 现在的设置最接近哪一档 */
export function paceOf(a: Pick<AutoPlay, 'perChar' | 'pause'>): Pace {
  const d = (p: Pace) => Math.abs(PACES[p].perChar - a.perChar) * 10 + Math.abs(PACES[p].pause - a.pause)
  return (['slow', 'normal', 'fast'] as Pace[]).reduce((best, p) => (d(p) < d(best) ? p : best), 'normal')
}

/** 一句最多等多久：再长的句子也不让人干等 */
export const MAX_DELAY_MS = 12_000

/** 空白 + 标点符号 */
const SKIP = /[\s\p{P}\p{S}]/u

/** 要读的字数 */
export function countChars(text: string): number {
  let n = 0
  for (const ch of text) if (!SKIP.test(ch)) n++
  return n
}

/** 自动播放：这句话该停多少毫秒（从字打完那一刻算起） */
export function delayFor(text: string, auto: Pick<AutoPlay, 'perChar' | 'pause'>): number {
  return Math.min(MAX_DELAY_MS, auto.pause + countChars(text) * auto.perChar)
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const pick = <T extends string>(v: unknown, all: readonly T[], d: T): T => (all.includes(v as T) ? (v as T) : d)
const num = (v: unknown, d: number, lim: { min: number; max: number }) => (typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), lim.min, lim.max) : d)

/** 读回来的设置过一遍：缺的补默认、越界的夹回范围、不认识的值丢掉 */
export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const a = (r.autoPlay && typeof r.autoPlay === 'object' ? r.autoPlay : {}) as Record<string, unknown>
  const v = (r.voice && typeof r.voice === 'object' ? r.voice : {}) as Record<string, unknown>
  const x = (r.sfx && typeof r.sfx === 'object' ? r.sfx : {}) as Record<string, unknown>
  const d = DEFAULT_SETTINGS
  const oneOf = (x: unknown, all: readonly number[], def: number) => (typeof x === 'number' && all.includes(x) ? x : def)
  return {
    textSpeed: pick(r.textSpeed, ['slow', 'normal', 'fast', 'instant'] as const, d.textSpeed),
    fontSize: pick(r.fontSize, ['small', 'normal', 'large'] as const, d.fontSize),
    motion: pick(r.motion, ['full', 'reduced'] as const, d.motion),
    choiceMode: pick(r.choiceMode, ['fill', 'send'] as const, d.choiceMode),
    autoPlay: {
      on: typeof a.on === 'boolean' ? a.on : d.autoPlay.on,
      perChar: num(a.perChar, d.autoPlay.perChar, LIMITS.perChar),
      pause: num(a.pause, d.autoPlay.pause, LIMITS.pause),
    },
    voice: {
      on: typeof v.on === 'boolean' ? v.on : d.voice.on,
      volume: num(v.volume, d.voice.volume, LIMITS.volume),
      maxLine: oneOf(v.maxLine, VOICE_MAX_LINE, d.voice.maxLine),
      maxTurn: oneOf(v.maxTurn, VOICE_MAX_TURN, d.voice.maxTurn),
    },
    sfx: {
      on: typeof x.on === 'boolean' ? x.on : d.sfx.on,
      volume: num(x.volume, d.sfx.volume, LIMITS.volume),
    },
  }
}

/** 两份设置一样吗（store 判断要不要写、要不要通知） */
export function sameSettings(a: Settings, b: Settings): boolean {
  return (
    a.textSpeed === b.textSpeed && a.fontSize === b.fontSize && a.motion === b.motion && a.choiceMode === b.choiceMode &&
    a.autoPlay.on === b.autoPlay.on && a.autoPlay.perChar === b.autoPlay.perChar && a.autoPlay.pause === b.autoPlay.pause &&
    a.voice.on === b.voice.on && a.voice.volume === b.voice.volume && a.voice.maxLine === b.voice.maxLine && a.voice.maxTurn === b.voice.maxTurn &&
    a.sfx.on === b.sfx.on && a.sfx.volume === b.sfx.volume
  )
}

/**
 * 「填入确认」模式下点选项：把这条加到输入框末尾（一行一条，按点击顺序叠加，同一条不重复）。
 * draft＝输入框现在的内容；stack＝本轮已经填进去的那几条（玩家手改过输入框就从头叠：stack 和 draft 对不上时只留这一条）。
 * 返回新的输入框内容和新的 stack。
 */
export function fillChoice(draft: string, stack: readonly string[], choice: string): { text: string; stack: string[] } {
  const c = choice.trim()
  const own = stack.length > 0 && draft === stack.join('\n')
  const base = own ? [...stack] : []
  if (!base.includes(c)) base.push(c)
  return { text: base.join('\n'), stack: base }
}
