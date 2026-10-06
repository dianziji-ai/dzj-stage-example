/**
 * 游戏规则（纯函数，可单测）。
 *
 * ★状态（好感 / 心情 / 天数）存在舞台的存档里，AI 每轮只写「变化」：
 *     status 区：好感变化: 3 / 好感变化: -2 · 心情: 害羞（变了才写）· 天数变化: 1（过了午夜才写）· 全没变就留空
 *   舞台负责累计、夹范围、每轮最多 ±5——规则在这里，不靠 AI 自觉。
 *   AI 要知道当前值：每句话末尾用 withState(话, stateForAi(save)) 附上 <dj_state> 状态块（useGame 的 send；平台只给模型看最新一份）。
 *   ⚠ 别用「好感: +3」：YAML 会把 +3 解析成 3，正号丢了，分不清是加 3 还是等于 3。
 *
 * 分区 id（卡里定义，英文）：scene{地点,时间,天气} · face{表情} · narrative · cg · status{好感变化,心情,天数变化} · game{硬币} · action
 * cg 区：剧情走到特别时刻，AI 只写一个回忆编号（「3」）；舞台解锁、弹出（编号 → 图走 SDK 的 imageUrl）。
 * game 区：AI 想请主人玩抓娃娃时写「硬币: 2」（每轮最多 COINS_PER_TURN_MAX 枚），舞台加进存档。
 */
import { zoneText, type StageSetup, type StageUser, type StageZones } from '@dianziji/stage'
import { COINS_PER_TURN_MAX, isPlush, plushName, START_COINS, type PlushId } from '../claw/data'
import { isExpr, isPlace, placeName, type ExprId, type PlaceId } from './content'

/** 抓娃娃机：硬币、收藏（娃娃 id → 个数）、玩了几局、抓到几只 */
export type ClawSave = { coins: number; collection: Partial<Record<PlushId, number>>; plays: number; wins: number }

export type GameSave = {
  location: PlaceId
  unlockedCg: number[]
  day: number
  love: number
  mood: string
  claw: ClawSave
}
export const DEFAULT_CLAW: ClawSave = { coins: START_COINS, collection: {}, plays: 0, wins: 0 }
export const DEFAULT_SAVE: GameSave = { location: 'home', unlockedCg: [], day: 1, love: 20, mood: '好奇', claw: DEFAULT_CLAW }

/** 每轮好感最多变多少 */
export const LOVE_STEP = 5

export type Status = { 好感: number; 心情: string; 天数: number }
const data = (z: StageZones, id: string): Record<string, unknown> | null => {
  const v = z[id]
  return v?.type === 'data' && v.value && typeof v.value === 'object' ? (v.value as Record<string, unknown>) : null
}
const num = (v: unknown): number | null => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)))

/*
 * 画面要的几样，从分区取（分区由 SDK 的 useZone 按区订阅拿到，这里只管「怎么解读」）：
 *   地点 / 时间 ← 场景区，表情 ← 表情区（都是 hold + complete：这一轮没写到用上一次的、写完才换）
 *   好感 / 心情 / 天数 ← 存档（一轮写完才结算进存档，流到一半不跳）
 */
export function placeOf(scene: Record<string, unknown>, fallback: PlaceId): PlaceId {
  return isPlace(scene['地点']) ? scene['地点'] : fallback
}
export function exprOf(face: Record<string, unknown>): ExprId {
  return isExpr(face['表情']) ? face['表情'] : 'normal'
}
export function timeOf(scene: Record<string, unknown>): string {
  const t = scene['时间']
  return t === undefined || t === null ? '' : String(t)
}
/** 心声：最多 40 字（模型偶尔写长了不让气泡撑满屏） */
export function thoughtOf(text: string): string {
  return text.trim().slice(0, 40)
}

/** 一轮写完：按这轮的分区和原文算新存档 + 本轮新解锁的 CG（按出现顺序）+ 好感实际变了多少 */
export function nextSave(z: StageZones, prev: GameSave): { save: GameSave; newCg: number[]; loveDelta: number } {
  const scene = data(z, 'scene')
  const st = data(z, 'status') ?? {}

  // 好感：「好感变化」是加减量（夹到 ±LOVE_STEP）；旧格式「好感」是直接设定值（存量开场里有）
  const delta = num(st['好感变化'])
  const abs = num(st['好感'])
  const love = clamp(delta !== null ? prev.love + clamp(delta, -LOVE_STEP, LOVE_STEP) : abs !== null ? abs : prev.love, 0, 100)
  const mood = typeof st['心情'] === 'string' && st['心情'].trim() ? st['心情'].trim().slice(0, 12) : prev.mood
  const dayDelta = num(st['天数变化'])
  const day = Math.max(1, dayDelta !== null ? prev.day + clamp(dayDelta, 0, 1) : (num(st['天数']) ?? prev.day))

  const loc = isPlace(scene?.['地点']) ? (scene!['地点'] as PlaceId) : prev.location
  const newCg = cgOf(z).filter((n) => !prev.unlockedCg.includes(n))
  const gift = num(data(z, 'game')?.['硬币'])
  const coins = prev.claw.coins + (gift === null ? 0 : clamp(gift, 0, COINS_PER_TURN_MAX))
  return {
    save: {
      location: loc,
      unlockedCg: [...prev.unlockedCg, ...newCg].sort((a, b) => a - b),
      day,
      love,
      mood,
      claw: { ...prev.claw, coins },
    },
    newCg,
    loveDelta: love - prev.love,
  }
}

/**
 * 玩家：进场前在平台初始设定里填的（卡里两个宏字段：user＝你的名字、call＝她怎么叫你）。
 * 没填（老会话 / 卡没设字段）→ 名字空、称呼「主人」，界面照常。avatar＝玩家站内头像（记录页用；没有就用名字首字）。
 */
export type Player = { name: string; call: string; avatar: string }
export function playerOf(setup: StageSetup | undefined, user?: StageUser | null): Player {
  const get = (key: string) => setup?.fields.find((f) => f.key === key)?.value?.trim() ?? ''
  return { name: get('user'), call: get('call') || '主人', avatar: user?.avatar ?? '' }
}

/** 随每句话附给 AI 的「此刻状态」（AI 据此写剧情、判断 CG 时机；它只写变化）。who＝玩家名字（提示词里地点叫「{{user}}的房间」） */
export function stateForAi(s: GameSave, who = '主人'): Record<string, unknown> {
  const got = Object.entries(s.claw.collection).filter(([, n]) => n && n > 0).map(([id, n]) => `${plushName(id)}×${n}`)
  return {
    地点: placeName(s.location, who),
    好感: s.love,
    心情: s.mood,
    天数: s.day,
    已解锁的回忆: s.unlockedCg,
    抓娃娃: `硬币 ${s.claw.coins} 枚 · 玩了 ${s.claw.plays} 局抓到 ${s.claw.wins} 只 · 收藏：${got.join('、') || '还没有'}`,
  }
}

/** 这次结算新解锁、要弹出来的 CG（按编号排好；配图库里没有图的跳过，不弹黑屏） */
export function freshCgs(prev: number[], next: number[], has: (n: number) => boolean): number[] {
  return next.filter((n) => !prev.includes(n) && has(n)).sort((a, b) => a - b)
}

/**
 * 这一轮 cg 区写了哪些回忆编号：取区里所有整数，1–8、去重、按出现顺序。
 * 现在的写法是只写数字（「3」）；老开场 / 老历史里的 ![](3) 里也是这个数字，一样认得。
 */
export function cgOf(z: StageZones): number[] {
  const out: number[] = []
  for (const m of zoneText(z, 'cg').matchAll(/\d+/g)) {
    const n = Number(m[0])
    if (n >= 1 && n <= 8 && !out.includes(n)) out.push(n)
  }
  return out
}

/** 存档读回来先过一遍：字段缺的补默认、值不合法的丢掉（作者改过结构或旧存档） */
export function normalizeSave(v: unknown): GameSave {
  const s = (v && typeof v === 'object' ? v : {}) as Partial<Record<keyof GameSave, unknown>>
  const cgs = Array.isArray(s.unlockedCg) ? s.unlockedCg.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 8) : []
  const love = num(s.love)
  const lv = love === null ? DEFAULT_SAVE.love : clamp(love, 0, 100)
  return {
    location: isPlace(s.location) ? s.location : DEFAULT_SAVE.location,
    unlockedCg: [...new Set(cgs)].sort((a, b) => a - b),
    day: Math.max(1, num(s.day) ?? 1),
    love: lv,
    mood: typeof s.mood === 'string' && s.mood.trim() ? s.mood.trim().slice(0, 12) : DEFAULT_SAVE.mood,
    claw: normalizeClaw(s.claw),
  }
}

function normalizeClaw(v: unknown): ClawSave {
  const c = (v && typeof v === 'object' ? v : {}) as Partial<Record<keyof ClawSave, unknown>>
  const collection: ClawSave['collection'] = {}
  if (c.collection && typeof c.collection === 'object') {
    for (const [id, n] of Object.entries(c.collection as Record<string, unknown>)) {
      const k = num(n)
      if (isPlush(id) && k !== null && k > 0) collection[id] = Math.floor(k)
    }
  }
  const int = (x: unknown, d: number) => Math.max(0, Math.floor(num(x) ?? d))
  return { coins: int(c.coins, START_COINS), collection, plays: int(c.plays, 0), wins: int(c.wins, 0) }
}

/**
 * 流式中 AI 正在写哪个区：最后一个打开、还没关上的 <区>。
 * 还没写出任何标签＝null（还在想）。只认这张卡的分区 id，别的尖括号不算。
 */
