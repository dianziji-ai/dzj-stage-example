/**
 * 这张卡的固定内容：地点、表情、素材地址、解锁规则。
 * 和卡里的提示词 / 分区约定一一对应（场景.地点 ∈ PLACES 的 id，表情.表情 ∈ EXPRESSIONS）。
 */

import manifest from './manifest.json'

/**
 * 素材地址：上传到卡素材库（R2）后的地址表 manifest.json（建卡脚本生成，文件名是随机的）。
 * 表里还没有的（比如刚出的立绘还没传）先用本地 public/assets 里的同名文件。
 */
const M = manifest as unknown as { bg: Record<string, string>; sprites: Record<string, string> }
// BASE_URL：开发时是 /，打包后是 ./（上传后在 {卡id}/{版本号}/ 下，绝对路径 /assets 会去域名根上找、全 404）
const local = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`

export type PlaceId = 'home' | 'street' | 'cafe' | 'arcade' | 'park' | 'rooftop'

/** at＝地图上的位置（百分比，地标中心）。地点一开始就全部开放（不做解锁） */
export const PLACES: { id: PlaceId; name: string; at: [number, number] }[] = [
  { id: 'home', name: '主人的房间', at: [21, 28] },
  { id: 'street', name: '霓虹商店街', at: [77, 27] },
  { id: 'cafe', name: '小鸡咖啡馆', at: [51, 49] },
  { id: 'arcade', name: '电玩城', at: [21, 74] },
  { id: 'park', name: '樱花公园', at: [78, 76] },
  { id: 'rooftop', name: '星空天台', at: [24, 11] },
]
export const isPlace = (v: unknown): v is PlaceId => PLACES.some((p) => p.id === v)
/** 地点名。who＝「主人的房间」里的主人换成谁（玩家看：她对你的称呼；给 AI 看：你的名字） */
export const placeName = (id: string, who = '主人') => withCall(PLACES.find((p) => p.id === id)?.name ?? id, who)

/** 本地写死的「主人」换成玩家在初始设定里选的称呼（台词、地点名都用它） */
export const withCall = (text: string, call: string) => (call && call !== '主人' ? text.replaceAll('主人', call) : text)

export type ExprId = 'normal' | 'happy' | 'shy' | 'pout' | 'surprised' | 'sad' | 'wink' | 'love'
export const EXPRESSIONS: ExprId[] = ['normal', 'happy', 'shy', 'pout', 'surprised', 'sad', 'wink', 'love']
export const isExpr = (v: unknown): v is ExprId => EXPRESSIONS.includes(v as ExprId)

export const bgUrl = (id: PlaceId) => M.bg[id] ?? local(`bg/${id}.webp`)
export const spriteUrl = (id: ExprId) => M.sprites[id] ?? local(`sprites/${id}.webp`)
export const MAP_URL = M.bg.map ?? local('bg/map.webp')

export const CHAR_NAME = '电子姬'
/** 电子姬 logo（名牌头像；站内 logo.jpeg 缩成 96px webp，3.6KB） */
export const LOGO_URL = `${import.meta.env.BASE_URL}brand/logo.webp`

/** 8 张回忆 CG 的名字（图册里显示；编号＝配图库 n） */
export const CG_NAMES = ['初遇', '电玩城对决', '啊——张嘴', '樱花下', '雨中共伞', '星空', '睡着了', '告白']
