import { describe, expect, it } from 'vitest'
import { readZones, writingZone, zoneData, zoneText, type StageSnapshot } from '@dianziji/stage'
import fx from './__fixtures__/card.json'
import schema from './state.schema.json'
import { cgOf, freshCgs, DEFAULT_SAVE, nextSave, normalizeSave, placeOf, playerOf, stateForAi, timeOf, travelOf } from './logic'
import { placeName, withCall } from './content'

// 这张卡真实的分区定义 + 开场原文（从卡数据抄出来的）
const snap = { slots: fx.slots, image_pack: fx.image_pack } as unknown as Pick<StageSnapshot, 'slots' | 'image_pack'>
const opening = readZones(fx.opening, snap)

describe('开场能正确拆区', () => {
  it('每个区都在、形状对', () => {
    expect(opening.scene).toMatchObject({ type: 'data', value: { 地点: 'home' } })
    expect(opening.narrative?.type).toBe('narrative')
    expect(zoneText(opening, 'narrative').length).toBeGreaterThan(200)
    expect(Array.isArray(opening.talk?.value)).toBe(true) // 对话区：SDK 已把 YAML 列表解析成数组
    expect(opening.talk?.value).toHaveLength(4)
    expect(opening.status).toBeUndefined() // 开场状态区留空：初值由存档默认值给（好感 20 / 好奇 / 第 1 天）
    expect(opening.action?.type).toBe('action')
    expect(opening.action?.value).toHaveLength(4)
  })
  it('配图编号原样留在分区里（SDK 不换地址，舞台自己用 imageUrl 取）', () => {
    expect(opening.cg?.value).toMatch(/^(!\[\]\()?1\)?$/)
  })
})

describe('画面解读：地点 / 时间', () => {
  const scene = zoneData(opening, 'scene')
  it('开场写的：地点 home、周五 23:47', () => {
    expect(placeOf(scene, 'cafe')).toBe('home')
    expect(timeOf(scene)).toBe('周五 23:47')
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
  it('旁白写完、下一个就是对话（输入栏里的「正在写 · 对话」靠它）', () => {
    expect(writingZone('<narrative>旁白</narrative>\n', ids)).toBe('talk')
    expect(writingZone('<talk>\n- 谁: 电子姬\n</talk>', ids)).toBe('status')
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
  it('状态区留空：什么都不变', () => {
    const prev = { ...DEFAULT_SAVE, love: 42, mood: '害羞', day: 3 }
    expect(nextSave(readZones('<status>\n</status>', snap), prev)).toMatchObject({ save: { love: 42, mood: '害羞', day: 3 }, loveDelta: 0 })
  })
  it('心情变了才写；天数变化只认 +1', () => {
    const z = readZones('<status>\n心情: 吃醋\n天数变化: 1\n</status>', snap)
    expect(nextSave(z, DEFAULT_SAVE).save).toMatchObject({ mood: '吃醋', day: 2 })
    expect(nextSave(readZones('<status>\n天数变化: 5\n</status>', snap), DEFAULT_SAVE).save.day).toBe(2)
    expect(nextSave(readZones('<status>\n天数变化: -1\n</status>', snap), { ...DEFAULT_SAVE, day: 3 }).save.day).toBe(3)
  })
  it('旧格式「好感: 20」当直接设定值（存量开场里有）', () => {
    expect(nextSave(readZones('<status>\n好感: 47\n</status>', snap), DEFAULT_SAVE).save.love).toBe(47)
  })
  it('附给 AI 的状态：中文地点名 + 当前数值 + 已解锁回忆', () => {
    expect(stateForAi({ ...DEFAULT_SAVE, location: 'park', love: 50, unlockedCg: [1, 4], claw: { coins: 2, collection: { goldchick: 1, chick: 2 }, plays: 6, wins: 3 } })).toEqual({
      地点: '樱花公园',
      好感: 50,
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

