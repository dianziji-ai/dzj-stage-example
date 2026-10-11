import { describe, expect, it } from 'vitest'
import { readZones, writingZone, zoneData, type StageSnapshot } from '@dianziji/stage'
import fx from './__fixtures__/card.json'
import replies from './__fixtures__/replies.json'
import schema from './state.schema.json'
import { backstageFrom, cgOf, checkFrom, dayOf, DEFAULT_SAVE, favorStage, freshCgs, nextSave, normalizeSave, placeOf, planOf, playerOf, reasonOf, stateForAi, stateLines, timeOf, travelOf, weatherIcon, weatherOf } from './logic'
import { placeName, withCall } from './content'

// 这张卡真实的分区定义 + 开场原文（从卡数据抄出来的）；replies＝自测时模型写的真实回复（检定 / 睡觉写日志 / 被冒犯）
const snap = { slots: fx.slots, image_pack: fx.image_pack } as unknown as Pick<StageSnapshot, 'slots' | 'image_pack'>
const opening = readZones(fx.opening, snap)

describe('开场能正确拆区', () => {
  it('每个区都在、形状对', () => {
    expect(opening.scene).toMatchObject({ type: 'data', value: { 地点: 'home' } })
    expect(opening.narrative?.type).toBe('data') // 剧本式正文是 YAML 列表
    expect(Array.isArray(opening.narrative?.value)).toBe(true) // 剧本式正文：SDK 已把 YAML 列表解析成数组
    expect(opening.talk).toBeUndefined() // 对话区已关（台词并进正文区）
    expect(zoneData(opening, 'status')).toMatchObject({ 好感变化: 0, 原因: '无' }) // 开场不动好感：初值由存档默认值给（好感 20 / 好奇 / 第 1 天）
    expect(zoneData(opening, 'system')).toMatchObject({ 电量: '23%' })
    expect(opening.diary).toBeUndefined() // 日志一天结束才写
    expect(opening.action?.type).toBe('action')
    expect(opening.action?.value).toHaveLength(4)
  })
  it('配图编号原样留在分区里（SDK 不换地址，舞台自己用 imageUrl 取）', () => {
    expect(opening.cg?.value).toMatch(/^(!\[\]\()?1\)?$/)
  })
})

describe('画面解读：地点 / 时间', () => {
  const scene = zoneData(opening, 'scene')
  it('开场写的：第 1 天、地点 home、23:47、晴、今日安排', () => {
    expect(placeOf(scene, 'cafe')).toBe('home')
    expect(timeOf(scene)).toBe('23:47')
    expect(dayOf(scene)).toBe(1)
    expect(weatherOf(scene)).toBe('晴')
    expect(planOf(scene)).toContain('现实世界')
  })
  it('第几天：数字、带引号的字符串、「第 2 天」都认；没写＝null', () => {
    expect(dayOf({ 第几天: 2 })).toBe(2)
    expect(dayOf({ 第几天: '3' })).toBe(3)
    expect(dayOf({ 第几天: '第 4 天' })).toBe(4)
    expect(dayOf({})).toBeNull()
    expect(dayOf(null)).toBeNull()
  })
  it('天气图标：认不出只写字', () => {
    expect(weatherIcon('晴')).toBe('☀️')
    expect(weatherIcon('多云')).toBe('⛅')
    expect(weatherIcon('雨')).toBe('🌧️')
    expect(weatherIcon('雪')).toBe('❄️')
    expect(weatherIcon('看不懂')).toBe('')
  })
  it('没写 / 写了不认识的地点：用存档里的；时间空', () => {
    expect(placeOf({}, 'cafe')).toBe('cafe')
    expect(placeOf({ 地点: '火星' }, 'cafe')).toBe('cafe')
    expect(timeOf({})).toBe('')
  })
})

describe('换场选项（travelOf）', () => {
  it('「【前往：id】一句话」认出来；开场第 4 条就是', () => {
    expect(travelOf('【前往：cafe】拉着她去楼下的小鸡咖啡馆吃蛋糕')).toEqual({ place: 'cafe', text: '拉着她去楼下的小鸡咖啡馆吃蛋糕' })
    expect(opening.action?.value).toContain('【前往：street】带她去楼下的霓虹商店街逛逛')
  })
  it('写中文名也认；没写那句话就补一句「和电子姬一起去」', () => {
    expect(travelOf('【前往：电玩城】')).toEqual({ place: 'arcade', text: '（和电子姬一起去电玩城）' })
  })
  it('普通选项、地图外的地方：null（地图外的整条不出）', () => {
    expect(travelOf('捏捏她的小鸡帽子')).toBeNull()
    expect(travelOf('【前往：火星】飞过去')).toBeNull()
  })
})

describe('正在写哪个区（SDK 的 writingZone + 这张卡的分区顺序）', () => {
  const ids = fx.slots.map((sl: { zone: string }) => sl.zone)
  it('正文写完、下一个就是状态（输入栏里的「正在写 · 状态」靠它）', () => {
    expect(writingZone('<narrative>\n- 谁: 旁白\n</narrative>\n', ids)).toBe('status')
  })
})

describe('nextSave：一轮写完更新存档', () => {
  it('开场：解锁 CG1，地点 home', () => {
    const { save, newCg } = nextSave(opening, DEFAULT_SAVE)
    expect(newCg).toEqual([1])
    expect(save).toMatchObject({ location: 'home', unlockedCg: [1], day: 1 })
  })
  it('已解锁的 CG 不重复弹', () => {
    const { newCg, save } = nextSave(opening, { ...DEFAULT_SAVE, unlockedCg: [1] })
    expect(newCg).toEqual([])
    expect(save.unlockedCg).toEqual([1])
  })
  it('去哪儿就是哪儿（地点全部开放）', () => {
    const { save } = nextSave(readZones('<scene>\n地点: rooftop\n</scene>', snap), DEFAULT_SAVE)
    expect(save.location).toBe('rooftop')
  })
  it('好感变化：累计、每轮最多 ±5、夹在 0–100', () => {
    const run = (z: string, love = 20) => nextSave(readZones(`<status>\n${z}\n</status>`, snap), { ...DEFAULT_SAVE, love })
    expect(run('好感变化: 3')).toMatchObject({ save: { love: 23 }, loveDelta: 3 })
    expect(run('好感变化: -2')).toMatchObject({ save: { love: 18 }, loveDelta: -2 })
    expect(run('好感变化: 20').save.love).toBe(25) // AI 给多了：夹到 +5
    expect(run('好感变化: 5', 98).save.love).toBe(100)
    expect(run('好感变化: -5', 2).save.love).toBe(0)
  })
  it('模型常把整数写成带引号的字符串（\'3\'）：一样认', () => {
    expect(nextSave(readZones(`<status>\n好感变化: '3'\n原因: '被夸了'\n</status>`, snap), DEFAULT_SAVE)).toMatchObject({ save: { love: 23 }, loveDelta: 3, reason: '被夸了' })
  })
  it('好感变了才带原因；没变 / 原因写「无」＝空', () => {
    expect(nextSave(readZones('<status>\n好感变化: 0\n原因: 无\n</status>', snap), DEFAULT_SAVE).reason).toBe('')
    expect(nextSave(readZones('<status>\n好感变化: 0\n原因: 只是聊天\n</status>', snap), DEFAULT_SAVE).reason).toBe('')
  })
  it('真实回复：恶作剧检定失败扣好感、被冒犯扣好感，都带原因', () => {
    const c = nextSave(readZones(replies.check, snap), { ...DEFAULT_SAVE, love: 30 })
    expect(c.loveDelta).toBeLessThan(0)
    expect(c.reason).toContain('布丁')
    const o = nextSave(readZones(replies.offend, snap), { ...DEFAULT_SAVE, love: 24 })
    expect(o.loveDelta).toBeLessThan(0)
    expect(o.reason).toBeTruthy()
    expect(reasonOf(readZones(replies.offend, snap))).toBe(o.reason)
  })
  it('状态区留空：什么都不变', () => {
    const prev = { ...DEFAULT_SAVE, love: 42, mood: '害羞', day: 3 }
    expect(nextSave(readZones('<status>\n</status>', snap), prev)).toMatchObject({ save: { love: 42, mood: '害羞', day: 3 }, loveDelta: 0 })
  })
  it('心情照写；天数取场景区的「第几天」：只增不减、每轮最多 +1、没写沿用', () => {
    const day = (scene: string, prev: number) => nextSave(readZones(`<scene>\n${scene}\n</scene>`, snap), { ...DEFAULT_SAVE, day: prev }).save.day
    expect(nextSave(readZones('<status>\n心情: 害羞\n</status>', snap), DEFAULT_SAVE).save.mood).toBe('害羞')
    expect(day('第几天: 2', 1)).toBe(2)
    expect(day("第几天: '2'", 1)).toBe(2)
    expect(day('第几天: 5', 1)).toBe(2) // 一下跳好几天：只认 +1
    expect(day('第几天: 1', 3)).toBe(3) // 抄错成更小的：不倒退
    expect(day('地点: cafe', 3)).toBe(3) // 没写：沿用
  })
  it('附给 AI 的状态：中文地点名 + 当前数值 + 已解锁回忆', () => {
    expect(stateForAi({ ...DEFAULT_SAVE, location: 'park', love: 50, unlockedCg: [1, 4], claw: { coins: 2, collection: { goldchick: 1, chick: 2 }, plays: 6, wins: 3 } })).toEqual({
      地点: '樱花公园',
      好感: 50,
      好感阶段: '心跳加速',
      心情: '好奇',
      天数: 1,
      已解锁的回忆: [1, 4],
      抓娃娃: '硬币 2 枚 · 玩了 6 局抓到 3 只 · 收藏：金色小鸡王×1、小黄鸡×2',
    })
  })
  it('AI 送硬币：game 区「硬币: N」，每轮最多 3 枚，负数不扣', () => {
    const coins = (n: number) => nextSave(readZones(`<game>\n硬币: ${n}\n</game>`, snap), DEFAULT_SAVE).save.claw.coins
    expect(coins(2)).toBe(DEFAULT_SAVE.claw.coins + 2)
    expect(coins(99)).toBe(DEFAULT_SAVE.claw.coins + 3)
    expect(coins(-5)).toBe(DEFAULT_SAVE.claw.coins)
    expect(nextSave({}, DEFAULT_SAVE).save.claw).toEqual(DEFAULT_SAVE.claw) // 没写 game 区：不动
  })
})

describe('cgOf / freshCgs / normalizeSave', () => {
  const cgIn = (body: string) => cgOf(readZones(`<narrative>\n正文 ![](5)\n</narrative>\n<cg>\n${body}\n</cg>`, snap))
  it('cg 区的回忆编号：只写数字；老写法 ![](3) 也认；去重、只认 1–8、按出现顺序；正文里的图不算', () => {
    expect(cgIn('3')).toEqual([3])
    expect(cgIn('![](3)')).toEqual([3])
    expect(cgIn('3、1、3、9、0')).toEqual([3, 1])
    expect(cgIn('')).toEqual([]) // 大多数回合留空
  })
  it('要弹的 CG：这次新解锁的全部（一张一张弹），按编号排；配图库里没图的跳过', () => {
    const has = (n: number) => n !== 5
    expect(freshCgs([1], [1, 6, 3, 5], has)).toEqual([3, 6])
    expect(freshCgs([1, 3], [1, 3], has)).toEqual([])
  })
  it('坏存档补默认、丢掉非法值', () => {
    expect(normalizeSave(null)).toEqual(DEFAULT_SAVE)
    expect(normalizeSave({ location: '火星', unlockedPlaces: ['home', 'x', 'park', 'park'], unlockedCg: [8, 2, 99, '3'], day: -2, love: 999, mood: '' })).toEqual({
      location: 'home',
      unlockedCg: [2, 3, 8],
      day: 1,
      love: 100,
      mood: '好奇',
      claw: DEFAULT_SAVE.claw,
    })
    // 抓娃娃存档：不认识的娃娃丢掉、负数和小数夹好
    expect(normalizeSave({ claw: { coins: -3, collection: { chick: 2.7, xxx: 5, goldchick: 0 }, plays: 'abc', wins: 2 } }).claw).toEqual({ coins: 0, collection: { chick: 2 }, plays: 0, wins: 2 })
  })
})

describe('好感阶段 / 检定 / 系统后台', () => {
  it('五个阶段按阈值切', () => {
    expect([0, 19, 20, 39, 40, 60, 79, 80, 100].map((n) => favorStage(n).name)).toEqual(['好奇的新室友', '好奇的新室友', '熟悉的同居人', '熟悉的同居人', '心跳加速', '想一直在一起', '想一直在一起', '心意相通', '心意相通'])
  })
  it('检定区：真实回复六项读得出来（值带引号也行）；没写行动＝null', () => {
    expect(checkFrom(zoneData(readZones(replies.check, snap), 'check'))).toEqual({ action: '趁她不注意偷吃她的布丁', attr: '手速', difficulty: '普通', target: '55', roll: '78', result: '失败' })
    expect(checkFrom(zoneData(opening, 'check'))).toBeNull()
  })
  it('系统后台：电量 / 心跳取数字，「无」当没写；整块没写＝null', () => {
    const b = backstageFrom(zoneData(readZones(replies.offend, snap), 'system'))!
    expect(b.battery).toBe(21)
    expect(b.heart).toBe(74)
    expect(b.temp).toBe('36℃')
    expect(b.learned).toBe('') // 写的是「无」
    expect(b.process).toBeTruthy()
    expect(backstageFrom(zoneData(opening, 'system'))).toMatchObject({ battery: 23, heart: 118, temp: '47℃' })
    expect(backstageFrom({})).toBeNull()
    expect(backstageFrom({ 电量: '140%' })?.battery).toBe(100)
  })
  it('stateLines：对象 → 一行一个「键: 值」，数组写成 JSON（检定接在后面用）', () => {
    expect(stateLines({ 好感: 20, 已解锁的回忆: [1, 2] })).toBe('好感: 20\n已解锁的回忆: [1,2]')
  })
})

describe('初始设定：名字 / 称呼', () => {
  const setup = (user: string | null, call: string | null) => ({
    text: '',
    fields: [
      { key: 'user', label: '你的名字', value: user },
      { key: 'call', label: '她怎么叫你', value: call },
    ],
  })

  it('读出名字和称呼', () => {
    expect(playerOf(setup('林川', '哥哥'))).toEqual({ name: '林川', call: '哥哥', avatar: '' })
  })
  it('没填 / 卡没设字段 / 老接口没有 setup → 名字空、称呼主人', () => {
    expect(playerOf(setup(null, '  '))).toEqual({ name: '', call: '主人', avatar: '' })
    expect(playerOf({ text: '', fields: [] })).toEqual({ name: '', call: '主人', avatar: '' })
    expect(playerOf(undefined)).toEqual({ name: '', call: '主人', avatar: '' })
  })
  it('头像取站内资料', () => {
    expect(playerOf(setup('林川', null), { id: 1, username: 'u', name: 'n', avatar: 'https://x/a.webp' }).avatar).toBe('https://x/a.webp')
  })
  it('台词和地点名里的「主人」换成称呼', () => {
    expect(withCall('抓到啦～主人好厉害！', '前辈')).toBe('抓到啦～前辈好厉害！')
    expect(withCall('冲呀主人！', '主人')).toBe('冲呀主人！')
    expect(placeName('home', '哥哥')).toBe('哥哥的房间')
    expect(placeName('cafe', '哥哥')).toBe('小鸡咖啡馆')
  })
  it('给 AI 的状态里地点用玩家名字（和提示词「{{user}}的房间」对上）', () => {
    expect(stateForAi(DEFAULT_SAVE, '林川').地点).toBe('林川的房间')
  })
})

describe('存档结构（state.schema.json）和代码对得上', () => {
  it('结构里各字段的 default 拼出来的开局存档＝DEFAULT_SAVE（只改了一边就会挂）', () => {
    const initial = Object.fromEntries(Object.entries(schema.properties).map(([k, p]) => [k, (p as { default?: unknown }).default]))
    expect(initial).toEqual(DEFAULT_SAVE)
    expect(normalizeSave(initial)).toEqual(DEFAULT_SAVE)
  })
})

