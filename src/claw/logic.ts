/**
 * 抓娃娃机规则（纯函数，可单测）。坐标都是机箱内的比例 0–1（x 向右，y 向下）。
 * 没有物理引擎：抓不抓得住是按「对得准不准 × 稀有度」算出来的概率，表现交给动画。
 */
import { GRIP, PLUSHIES, RARITY_WEIGHT, type PlushId, type Rarity } from './data'

export type Rng = () => number

/** 可复现的随机数（测试用固定种子，游戏里用时间当种子） */
export function seeded(seed: number): Rng {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

export type Plush = { key: number; id: PlushId; rarity: Rarity; x: number; y: number; tilt: number }

/** 出口在左边：夹子 / 娃娃都不进这一段 */
export const CHUTE_X = 0.1
export const X_MIN = 0.24
export const X_MAX = 0.9
/** 夹子中心离娃娃中心多远以内才算夹到（比例） */
export const REACH = 0.085

export function pickPlush(rng: Rng): { id: PlushId; rarity: Rarity } {
  const total = Object.values(RARITY_WEIGHT).reduce((a, b) => a + b, 0)
  let r = rng() * total
  let rarity: Rarity = 'normal'
  for (const [k, w] of Object.entries(RARITY_WEIGHT) as [Rarity, number][]) {
    if ((r -= w) < 0) {
      rarity = k
      break
    }
  }
  const pool = PLUSHIES.filter((p) => p.rarity === rarity)
  const p = pool[Math.floor(rng() * pool.length)]
  return { id: p.id, rarity }
}

/** 摆一堆娃娃：横向大致均匀铺开 + 一点随机，两层错落 */
export function makePile(rng: Rng, n = 7, startKey = 0): Plush[] {
  return Array.from({ length: n }, (_, i) => {
    const slot = X_MIN + ((X_MAX - X_MIN) * (i + 0.5)) / n
    return {
      key: startKey + i,
      ...pickPlush(rng),
      x: clamp(slot + (rng() - 0.5) * 0.05, X_MIN, X_MAX),
      y: 0.8 + (i % 2) * 0.06 + (rng() - 0.5) * 0.02,
      tilt: (rng() - 0.5) * 24,
    }
  })
}

/** 夹子在 x 落下，会对上哪只（最近的那只；够不着就是 null） */
export function target(pile: Plush[], x: number): Plush | null {
  let best: Plush | null = null
  for (const p of pile) if (!best || Math.abs(p.x - x) < Math.abs(best.x - x)) best = p
  return best && Math.abs(best.x - x) <= REACH ? best : null
}

export type Outcome = { kind: 'miss' } | { kind: 'slip'; plush: Plush; at: number } | { kind: 'win'; plush: Plush }

/**
 * 判定一抓：没对上＝miss；对上了按「对准度 × 稀有度抓牢率」掷骰，没抓牢就在提起途中滑落（at＝提到多高掉的，0–1）。
 * 对准度：正中 1，边缘 0.45。
 */
export function grab(pile: Plush[], x: number, rng: Rng): Outcome {
  const p = target(pile, x)
  if (!p) return { kind: 'miss' }
  const aim = 1 - (Math.abs(p.x - x) / REACH) * 0.55
  return rng() < GRIP[p.rarity] * aim ? { kind: 'win', plush: p } : { kind: 'slip', plush: p, at: 0.25 + rng() * 0.5 }
}

/** 夹子来回摆：t 秒时的位置（正弦，两头慢中间快，好按） */
export function swingX(t: number, period = 2.6): number {
  return X_MIN + (X_MAX - X_MIN) * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / period))
}

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
export const easeIn = (t: number) => t * t
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
