/**
 * 自动播放的时间怎么算（纯函数，不碰 DOM / React）。
 *   等多久 ＝ 句末停顿 + 字数 × 每字时间，最多 MAX_DELAY_MS。
 *   字数：只数「要读的字」——空白和标点不算（「……」「！！」不该让人多等）。
 */

/** 玩家的设置：on＝开没开；perChar＝每个字停多少毫秒；pause＝每句末尾额外停多少毫秒 */
export type AutoPlayPrefs = { on: boolean; perChar: number; pause: number }

export const DEFAULT_PREFS: AutoPlayPrefs = { on: false, perChar: 90, pause: 1500 }

/** 设置的取值范围（设置面板的滑杆也用它） */
export const LIMITS = {
  perChar: { min: 20, max: 250, step: 10 },
  pause: { min: 0, max: 5000, step: 250 },
} as const

/** 一句最多等多久：再长的句子也不让人干等 */
export const MAX_DELAY_MS = 12_000

/** 空白 + 常见中英文标点（含引号、括号、省略号、破折号） */
const SKIP = /[\s\p{P}\p{S}]/u

/** 要读的字数 */
export function countChars(text: string): number {
  let n = 0
  for (const ch of text) if (!SKIP.test(ch)) n++
  return n
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** 读回来的设置过一遍：缺的补默认、越界的夹回范围、类型不对的丢掉 */
export function normalizePrefs(raw: unknown): AutoPlayPrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof AutoPlayPrefs, unknown>>
  const num = (v: unknown, d: number, lim: { min: number; max: number }) => (typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), lim.min, lim.max) : d)
  return {
    on: typeof r.on === 'boolean' ? r.on : DEFAULT_PREFS.on,
    perChar: num(r.perChar, DEFAULT_PREFS.perChar, LIMITS.perChar),
    pause: num(r.pause, DEFAULT_PREFS.pause, LIMITS.pause),
  }
}

/** 这句话该停多少毫秒 */
export function delayFor(text: string, prefs: Pick<AutoPlayPrefs, 'perChar' | 'pause'>): number {
  return Math.min(MAX_DELAY_MS, prefs.pause + countChars(text) * prefs.perChar)
}
