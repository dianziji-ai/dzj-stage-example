/**
 * 抓娃娃机（这张卡专属的小游戏，演示「舞台里能放任何玩法」；做自己的卡时可以删掉：要一起改的地方见 docs/getting-started.md「不要的玩法」）。
 * 娃娃清单 / 稀有度 / 硬币规则。图在卡的素材库里，地址见 game/manifest.json 的 plush。
 */
import manifest from '../game/manifest.json'

export type Rarity = 'normal' | 'rare' | 'gold'
export type PlushId = 'chick' | 'eggchick' | 'pinkchick' | 'starchick' | 'dianji' | 'goldchick'

export const PLUSHIES: { id: PlushId; name: string; rarity: Rarity }[] = [
  { id: 'chick', name: '小黄鸡', rarity: 'normal' },
  { id: 'eggchick', name: '蛋壳小鸡', rarity: 'normal' },
  { id: 'pinkchick', name: '粉粉小鸡', rarity: 'normal' },
  { id: 'starchick', name: '星星小鸡', rarity: 'rare' },
  { id: 'dianji', name: '电子姬玩偶', rarity: 'rare' },
  { id: 'goldchick', name: '金色小鸡王', rarity: 'gold' },
]

export const plushName = (id: string) => PLUSHIES.find((p) => p.id === id)?.name ?? id
export const isPlush = (v: unknown): v is PlushId => PLUSHIES.some((p) => p.id === v)

/** 娃娃堆里各稀有度出现的权重 */
export const RARITY_WEIGHT: Record<Rarity, number> = { normal: 70, rare: 25, gold: 5 }
/** 夹子对准时的基础抓牢率（越稀有越难） */
export const GRIP: Record<Rarity, number> = { normal: 0.78, rare: 0.5, gold: 0.28 }
export const RARITY_LABEL: Record<Rarity, string> = { normal: '普通', rare: '稀有', gold: '金色' }

/** 开局硬币；每局 1 枚；AI 每轮最多送几枚 */
export const START_COINS = 5
export const COINS_PER_TURN_MAX = 3

const M = manifest as unknown as { plush?: Record<string, string> }
export const plushUrl = (id: PlushId) => M.plush?.[id] ?? ''
