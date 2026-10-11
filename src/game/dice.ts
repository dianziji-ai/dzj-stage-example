/*
 * 行动检定（照《妈妈柳月儿》舞台的掷骰搬过来，文案按电子姬重写）：掷 1～100，点数 ≤ 目标值＝成功。
 * 目标值＝难度基础值 + 好感每 10 点加 3，限制在 15～95。
 * 结果作为 <dj_state> 状态附在玩家这句话后面一起发（checkState）——卡的检定区规则要求 AI 照抄六项、按结果演、不重掷不改判。
 *
 *   · 行动分两种性质：对她好的（日常 / 心动）失败＝没做成，好感不变；恶作剧失败＝被抓包，才扣好感。
 *   · 难度不让玩家选：现成方案各自带，自己写的按分类定（玩家自己挑难度等于都挑简单）。
 *   · 掷之前就告诉玩家失败会怎样，发给 AI 的说明也按性质分开写。
 */

export const ATTRS = [
  { id: '撒娇力', icon: '🥺', hint: '哄她、逗她、软磨硬泡' },
  { id: '体贴', icon: '🤲', hint: '照顾、帮忙、关心她' },
  { id: '勇气', icon: '🔥', hint: '牵手、表白、主动靠近' },
  { id: '手速', icon: '🐾', hint: '抢先、偷拿、抓娃娃、打游戏' },
] as const

export const DIFFS = [
  { id: '简单', base: 75 },
  { id: '普通', base: 55 },
  { id: '困难', base: 35 },
  { id: '极难', base: 15 },
] as const

export type Attr = (typeof ATTRS)[number]['id']
export type Diff = (typeof DIFFS)[number]['id']

/** 好感加成：每 10 点 +3 */
export const favorBonus = (love: number) => Math.floor(Math.max(0, love) / 10) * 3

/** 目标值（成功率 %） */
export function targetOf(diff: Diff, love: number): number {
  const base = DIFFS.find((d) => d.id === diff)?.base ?? 55
  return Math.max(15, Math.min(95, base + favorBonus(love)))
}

/** 掷一次 1～100（crypto 随机） */
export function rollD100(): number {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return 1 + (a[0] % 100)
}

export type Outcome = 'crit' | 'success' | 'fail' | 'fumble'

/** 演出用的四档（结果只有成功 / 失败两种）：目标值的一成以内＝大成功，96 以上＝大失败 */
export function outcomeOf(roll: number, target: number): Outcome {
  if (roll <= target) return roll <= Math.max(1, Math.floor(target / 10)) ? 'crit' : 'success'
  return roll >= 96 ? 'fumble' : 'fail'
}

/** 行动性质：warm＝对她好（失败不扣好感）；prank＝恶作剧（失败被抓包、扣好感） */
export type Nature = 'warm' | 'prank'

/** 一次掷好的检定：演完随这句行动一起发出去 */
export type CheckDraft = { action: string; attr: Attr; diff: Diff; target: number; roll: number; nature: Nature }

const passed = (c: CheckDraft) => c.roll <= c.target

/** 失败会怎样（掷之前给玩家看） */
export const FAIL_HINT: Record<Nature, string> = {
  warm: '对她好的事：失败只是没做成，不扣好感',
  prank: '恶作剧：失败会被她当场抓包，要扣好感',
}

/** 发给 AI 的说明：按性质分开写，善意失败绝不扣分（和卡里检定区的规则一致） */
const HEAD: Record<Nature, string> = {
  warm: '这是对她好的行动。成功＝好感按难度加（难度越高加得越多）；失败＝没做成、出了点小糗，好感不变、绝不扣分。',
  prank: '这是恶作剧。成功＝她没发现或被逗笑，好感不变或 +1；失败＝被她当场抓包，她鼓着腮闹别扭，好感按难度扣 1～3。',
}
const EXTRA: Record<Nature, Partial<Record<Outcome, string>>> = {
  warm: { crit: '这次是大成功：她的反应和好感加成再大一档。', fumble: '这次是大失败：出了个大糗，但依然不扣好感。' },
  prank: { crit: '这次是大成功：她完全没察觉，或者笑得停不下来。', fumble: '这次是大失败：被她抓了个正着，还被她记进了小本本。' },
}

/**
 * 发送时附在玩家这句话末尾的状态（和 stateForAi 一起由 SDK withState 包成 <dj_state>）：
 * 平台只把最后一条玩家消息里的状态交给模型、历史里的整块删——所以这次检定只在这一轮生效，聊天页 / 摘要也看不到它。
 */
export function checkState(c: CheckDraft): string {
  const clean = (t: string) => t.replace(/[\n:：]/g, ' ').trim()
  const extra = EXTRA[c.nature][outcomeOf(c.roll, c.target)] ?? ''
  return [
    `【行动检定】玩家已在界面上掷骰，结果已定，照着演、不重掷不改判。${HEAD[c.nature]}${extra}`,
    `行动: ${clean(c.action)}`,
    `属性: ${c.attr}`,
    `难度: ${c.diff}`,
    `目标: ${c.target}`,
    `掷骰: ${c.roll}`,
    `结果: ${passed(c) ? '成功' : '失败'}`,
  ].join('\n')
}

// ───────── 预设行动（点一下填好行动 + 属性 + 难度；能搜） ─────────

export const PRESET_CATS = ['日常', '心动', '恶作剧'] as const
export type PresetCat = (typeof PRESET_CATS)[number]
export type Preset = { cat: PresetCat; icon: string; text: string; attr: Attr; diff: Diff; tags?: string; minFavor?: number }

/** 按这张卡的设定写的（六个地点、布丁、小鸡帽、手柄、抓娃娃、樱花、星空…）；minFavor 只是提示门槛，不拦 */
export const PRESETS: Preset[] = [
  { cat: '日常', icon: '🍮', text: '给她买一盒布丁，看她第一次吃的样子', attr: '体贴', diff: '简单', tags: '布丁 吃 便利店 商店街' },
  { cat: '日常', icon: '🐤', text: '帮她把歪掉的小鸡帽子扶正', attr: '体贴', diff: '简单', tags: '小鸡帽 帽子 房间' },
  { cat: '日常', icon: '📖', text: '耐心教她一个现实世界的常识', attr: '体贴', diff: '普通', tags: '常识 教 学 房间' },
  { cat: '日常', icon: '🎮', text: '陪她打一局游戏，故意让她赢', attr: '手速', diff: '普通', tags: '游戏 手柄 打游戏 房间' },
  { cat: '日常', icon: '🧸', text: '在电玩城帮她抓到最想要的那只小鸡', attr: '手速', diff: '困难', tags: '抓娃娃 电玩城 娃娃 arcade' },
  { cat: '日常', icon: '☕', text: '在咖啡馆点一份草莓蛋糕和她分着吃', attr: '撒娇力', diff: '简单', tags: '咖啡馆 蛋糕 草莓 cafe' },
  { cat: '心动', icon: '🤝', text: '逛商店街时自然地牵起她的手', attr: '勇气', diff: '困难', tags: '牵手 商店街 霓虹 street' },
  { cat: '心动', icon: '🌸', text: '在樱花树下替她拂掉头发上的花瓣', attr: '勇气', diff: '普通', tags: '樱花 公园 花瓣 park' },
  { cat: '心动', icon: '✨', text: '在天台陪她数星星，说她比星星亮', attr: '撒娇力', diff: '困难', tags: '星空 天台 星星 rooftop' },
  { cat: '心动', icon: '🫂', text: '她委屈的时候轻轻抱住她', attr: '勇气', diff: '困难', tags: '拥抱 抱 委屈 安慰' },
  { cat: '心动', icon: '💌', text: '认真地告诉她「有你在真好」', attr: '勇气', diff: '极难', tags: '表白 告白 喜欢 心意', minFavor: 60 },
  { cat: '恶作剧', icon: '🥄', text: '趁她不注意偷吃一口她的布丁', attr: '手速', diff: '普通', tags: '偷吃 布丁' },
  { cat: '恶作剧', icon: '🎩', text: '把她的小鸡帽子藏起来，看她到处找', attr: '手速', diff: '普通', tags: '小鸡帽 藏 帽子' },
  { cat: '恶作剧', icon: '🔌', text: '假装要拔掉电脑电源吓她一下', attr: '撒娇力', diff: '困难', tags: '电脑 电源 吓 程序' },
  { cat: '恶作剧', icon: '🕹️', text: '打游戏时偷偷按她的手柄让她输', attr: '手速', diff: '困难', tags: '游戏 手柄 作弊' },
  { cat: '恶作剧', icon: '💤', text: '趁她睡着在她脸上贴一张小鸡贴纸', attr: '手速', diff: '普通', tags: '睡着 贴纸 睡觉' },
]

/** 搜预设：空格分开的每个词都要命中（行动文字或标签里有就算） */
export function searchPresets(q: string, cat: PresetCat | null = null): Preset[] {
  const words = q.trim().split(/\s+/).filter(Boolean)
  return PRESETS.filter((p) => (!cat || p.cat === cat) && words.every((w) => p.text.includes(w) || (p.tags ?? '').includes(w) || p.attr === w))
}

/** 分类定性质：日常 / 心动＝对她好；恶作剧＝恶作剧。自己写的没选分类＝对她好 */
export const natureOf = (cat: PresetCat | null): Nature => (cat === '恶作剧' ? 'prank' : 'warm')

/** 自己写的行动：难度按分类定（没选分类＝按心动算，普通） */
export function diffOfCat(cat: PresetCat | null): Diff {
  return ({ 日常: '简单', 心动: '普通', 恶作剧: '普通' } as const)[cat ?? '心动']
}
