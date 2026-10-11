/**
 * 游戏规则（纯函数，可单测）。
 *
 * ★状态（好感 / 心情 / 天数）存在舞台的存档里，AI 每轮只写「变化」：
 *     status 区：好感变化: 3 / 好感变化: -2（整数，没变写 0）· 原因: 一句话 · 心情: 害羞
 *     scene 区：第几天: 2（睡了一觉第二天醒来才 +1）
 *   舞台负责累计、夹范围、好感每轮最多 ±5、天数只增不减且每轮最多 +1——规则在这里，不靠 AI 自觉。
 *   AI 要知道当前值：每句话末尾用 withState(话, stateForAi(save)) 附上 <dj_state> 状态块（useGame 的 send；平台只给模型看最新一份）。
 *   ⚠ 别用「好感: +3」：YAML 会把 +3 解析成 3，正号丢了，分不清是加 3 还是等于 3。
 *
 * 分区 id（卡里定义，英文）：
 *   scene{第几天,时间,时段,天气,地点,穿着,今日安排} · narrative 剧本式正文 · status{好感变化,原因,心情}
 *   check{行动,属性,难度,目标,掷骰,结果}（玩家掷了骰才写）· cg · game{硬币}
 *   system「系统后台」{电量,心跳,CPU温度,新学会,后台进程,存进C盘} · thought 心声 · diary 日志（一天结束才写，diary.ts）· action
 *   旁白 / 对话怎么拆成一句一句：beats.ts；立绘、背景怎么挑：art.ts（这里只管存档和规则）。
 * cg 区：剧情走到特别时刻，AI 只写一个回忆编号（「3」）；舞台解锁、弹出（编号 → 图走 SDK 的 imageUrl）。
 * game 区：AI 想请主人玩抓娃娃时写「硬币: 2」（每轮最多 COINS_PER_TURN_MAX 枚），舞台加进存档。
 */
import { zoneText, type StageSetup, type StageUser, type StageZones } from '@dianziji/stage'
import { COINS_PER_TURN_MAX, isPlush, plushName, START_COINS, type PlushId } from '../claw/data'
import { FAVOR_STAGES, isPlace, PLACES, placeName, type PlaceId } from './content'

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
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').trim()
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)))

/*
 * 画面要的几样，从分区取（分区由 SDK 的 useZone 按区订阅拿到，这里只管「怎么解读」）：
 *   地点 / 时间 ← 场景区（hold + complete：这一轮没写到用上一次的、写完才换）
 *   好感 / 心情 / 天数 ← 存档（一轮写完才结算进存档，流到一半不跳）
 *   立绘 ← 对话区里她每一句的表情（beats.ts）
 */
export function placeOf(scene: Record<string, unknown>, fallback: PlaceId): PlaceId {
  return isPlace(scene['地点']) ? scene['地点'] : fallback
}
export function timeOf(scene: Record<string, unknown>): string {
  return str(scene['时间'])
}
/** 天气：晴 / 多云 / 雨 / 雪（写了别的原样给）；没写＝'' */
export const weatherOf = (scene: Record<string, unknown>) => str(scene['天气'])
/** 今日安排：她今天想做的事（一句话）；没写＝'' */
export const planOf = (scene: Record<string, unknown>) => str(scene['今日安排'])
/** 天气 → 小图标（认不出＝''，只写字） */
export function weatherIcon(w: string): string {
  if (/雪/.test(w)) return '❄️'
  if (/雨/.test(w)) return '🌧️'
  if (/阴|云/.test(w)) return '⛅'
  if (/晴/.test(w)) return '☀️'
  return ''
}
/** 场景区的「第几天」：2、'2'、「第 2 天」都认；没写＝null */
export function dayOf(scene: Record<string, unknown> | null): number | null {
  const m = str(scene?.['第几天']).match(/\d+/)
  return m ? Number(m[0]) : null
}

/** 好感阶段（阈值在 content.ts 的 FAVOR_STAGES）：给 AI 看（stateForAi）、顶栏 / 好感演出上显示 */
export function favorStage(love: number) {
  return [...FAVOR_STAGES].reverse().find((s) => love >= s.min) ?? FAVOR_STAGES[0]
}

/** 状态区的「原因」：好感为什么变（没写 / 写了「无」＝''） */
export function reasonOf(z: StageZones): string {
  const r = zoneText(z, 'status', '原因')
  return r === '无' ? '' : r
}

/** 行动检定（check 区）：这一轮没检定（没写行动）＝null */
export type Check = { action: string; attr: string; difficulty: string; target: string; roll: string; result: string }
export function checkFrom(d: Record<string, unknown>): Check | null {
  const c = { action: str(d['行动']), attr: str(d['属性']), difficulty: str(d['难度']), target: str(d['目标']), roll: str(d['掷骰']), result: str(d['结果']) }
  return c.action ? c : null
}

/**
 * 系统后台（system 区）：她自己看不见、玩家在状态弹窗里偷看的那一块。每项没写＝''（电量 / 心跳没写或不是数字＝null）。
 * 电量写「76%」、心跳写「92」或「92 bpm」都认。
 */
export type Backstage = { battery: number | null; heart: number | null; temp: string; learned: string; process: string; saved: string }
export function backstageFrom(d: Record<string, unknown>): Backstage | null {
  const n = (k: string) => {
    const m = str(d[k]).match(/\d+/)
    return m ? Number(m[0]) : null
  }
  const none = (k: string) => (str(d[k]) === '无' ? '' : str(d[k]))
  const b = { battery: n('电量'), heart: n('心跳'), temp: str(d['CPU温度']), learned: none('新学会'), process: none('后台进程'), saved: none('存进C盘') }
  return b.battery === null && b.heart === null && !b.temp && !b.learned && !b.process && !b.saved ? null : { ...b, battery: b.battery === null ? null : Math.min(100, b.battery) }
}

/**
 * 换场选项：选项区可选的第 4 条「【前往：cafe】拉着她去楼下的小鸡咖啡馆吃蛋糕」。
 * 认出来＝{ 去哪、点了发什么 }；不是换场、或地点不在地图里（只认 6 个地点的 id 或中文名）＝null。
 * ★地图外的整条不出（返回 null 的调用方把它丢掉），也不当普通选项露出「【前往：…】」。
 */
export type Travel = { place: PlaceId; text: string }
const TRAVEL = /^【前往[：:]\s*([^】]+)】\s*(.*)$/
export function travelOf(choice: string): Travel | null {
  const m = choice.trim().match(TRAVEL)
  if (!m) return null
  const key = m[1].trim()
  const place = isPlace(key) ? key : PLACES.find((p) => key.includes(p.name.replace('主人的', '')))?.id
  if (!place) return null
  return { place, text: m[2].trim() || `（和电子姬一起去${placeName(place)}）` }
}

/** 一轮写完：按这轮的分区和原文算新存档 + 本轮新解锁的 CG（按出现顺序）+ 好感实际变了多少 + 为什么（演出用） */
export function nextSave(z: StageZones, prev: GameSave): { save: GameSave; newCg: number[]; loveDelta: number; reason: string } {
  const scene = data(z, 'scene')
  const st = data(z, 'status') ?? {}

  // 好感：「好感变化」是加减量，夹到 ±LOVE_STEP（模型偶尔写成 '3' 字符串、+3，num 都认）
  const delta = num(st['好感变化'])
  const love = clamp(delta !== null ? prev.love + clamp(delta, -LOVE_STEP, LOVE_STEP) : prev.love, 0, 100)
  const mood = typeof st['心情'] === 'string' && st['心情'].trim() ? st['心情'].trim().slice(0, 12) : prev.mood
  // 天数：场景区的「第几天」，只增不减、每轮最多 +1（模型抄错成更小的、或一下跳好几天都不认）；没写沿用
  const d = dayOf(scene)
  const day = d === null ? prev.day : clamp(d, prev.day, prev.day + 1)

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
    reason: love !== prev.love ? reasonOf(z) : '',
  }
}

/**
 * 玩家：进场前在平台初始设定里填的（卡里两个宏字段：user＝你的名字、call＝她怎么叫你）。
 * 没填（老会话 / 卡没设字段）→ 名字空、称呼「主人」，界面照常。avatar＝玩家站内头像。
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
    好感阶段: favorStage(s.love).name,
    心情: s.mood,
    天数: s.day,
    已解锁的回忆: s.unlockedCg,
    抓娃娃: `硬币 ${s.claw.coins} 枚 · 玩了 ${s.claw.plays} 局抓到 ${s.claw.wins} 只 · 收藏：${got.join('、') || '还没有'}`,
  }
}

/** 状态对象 → 「键: 值」一行一个（数组 / 对象写成 JSON，和 SDK withState 收对象时一样）：要在后面再接一段文字（检定）时用 */
export function stateLines(o: Record<string, unknown>): string {
  return Object.entries(o)
    .map(([k, v]) => `${k}: ${typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}`)
    .join('\n')
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

