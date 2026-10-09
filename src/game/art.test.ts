import { describe, expect, it } from 'vitest'
import type { StageSnapshot } from '@dianziji/stage'
import fx from './__fixtures__/card.json'
import { bgOf, mapOf, periodOf, spriteOf, toneOf, type Look } from './art'

// 这张卡线上的配图库（立绘 / 背景 / 地图的挑图规则全写在分组名里）
const pack = { image_pack: fx.image_pack } as unknown as Pick<StageSnapshot, 'image_pack'>
const byN = new Map(fx.image_pack.images.map((im) => [im.n, im.g as string[]]))
/** 挑出来那张图的标签（看组名比看地址好懂） */
const tagsOf = (look: Partial<Look>, wear = '', prev: number | null = null) => {
  const prevImg = prev == null ? null : (fx.image_pack.images.find((im) => im.n === prev) as never)
  const img = spriteOf(pack, { expr: '', act: '', seed: 's', ...look }, wear, prevImg)
  return img ? byN.get(img.n)!.map((g) => g.split('/').slice(1).join('/').replace(/\|.*$/, '')).join(' · ') : null
}

describe('立绘：AI 写的事实 → 配图库里的图', () => {
  it('穿着 + 表情', () => {
    expect(tagsOf({ expr: '害羞' }, '睡衣')).toContain('穿着=睡衣 · 表情=害羞')
    expect(tagsOf({ expr: '开心' }, '外出服')).toContain('穿着=外出服 · 表情=开心')
  })
  it('近义词：脸红 → 害羞、坏笑 → 调皮、「有点不开心」→ 委屈（不是开心）', () => {
    expect(tagsOf({ expr: '脸红' }, '卫衣')).toContain('表情=害羞')
    expect(tagsOf({ expr: '坏笑' }, '卫衣')).toContain('表情=调皮')
    expect(tagsOf({ expr: '有点不开心' }, '卫衣')).toContain('表情=委屈')
    expect(tagsOf({ expr: '开心' }, '连衣裙')).toContain('穿着=外出服')
  })
  it('动作排在穿着前面：穿着睡衣握着手柄 → 打游戏那张（只有卫衣版）；动作原文里包含就算', () => {
    expect(tagsOf({ expr: '开心', act: '两手紧紧握着手柄' }, '睡衣')).toContain('动作=打游戏 · 表情=开心')
    expect(tagsOf({ expr: '生气', act: '把游戏机摔在沙发上' }, '卫衣')).toContain('动作=打游戏 · 表情=生气')
    expect(tagsOf({ expr: '平常', act: '抱着抱枕打瞌睡' }, '睡衣')).toContain('动作=睡着')
  })
  it('动作里的情绪词不会被当成动作：「开心地转了个圈」照样按穿着 + 表情挑', () => {
    expect(tagsOf({ expr: '害羞', act: '开心地转了个圈' }, '睡衣')).toBe('谁=电子姬 · 穿着=睡衣 · 表情=害羞')
  })
  it('没写穿着：第一句穿默认的小鸡卫衣；之后留在上一张那套', () => {
    expect(tagsOf({ expr: '开心' })).toContain('穿着=卫衣')
    const pajamaShy = fx.image_pack.images.find((im) => im.g.some((g) => g.startsWith('立绘/穿着=睡衣')) && im.g.some((g) => g.startsWith('立绘/表情=害羞')))!.n
    expect(tagsOf({ expr: '开心' }, '', pajamaShy)).toContain('穿着=睡衣 · 表情=开心')
    expect(tagsOf({ expr: '开心' }, '比基尼', pajamaShy)).toContain('穿着=睡衣 · 表情=开心') // 认不出的穿着也留在上一套
  })
  it('认不出的表情：不乱跳，留在和上一张最像的那张', () => {
    const pajamaShy = fx.image_pack.images.find((im) => im.g.some((g) => g.startsWith('立绘/穿着=睡衣')) && im.g.some((g) => g.startsWith('立绘/表情=害羞')))!.n
    expect(tagsOf({ expr: '嗯' }, '睡衣', pajamaShy)).toContain('穿着=睡衣 · 表情=害羞')
  })
  it('同一句回看永远是同一张', () => {
    expect(spriteOf(pack, { expr: '开心', act: '', seed: '「欢迎回来！」' }, '卫衣')).toEqual(spriteOf(pack, { expr: '开心', act: '', seed: '「欢迎回来！」' }, '卫衣'))
  })
})

describe('背景：地点 + 时段', () => {
  const day = bgOf(pack, 'home', '周六 10:30')
  const night = bgOf(pack, 'home', '周五 22:15')
  it('房间分白天 / 晚上；中文地名、「傍晚」这种写法也认', () => {
    expect(day).not.toBe(night)
    expect(bgOf(pack, '房间', '傍晚')).toBe(night)
    expect(bgOf(pack, 'home', '清晨')).toBe(day)
  })
  it('别的地点只有一张，时段不影响；地点认不出＝空（沿用上一张）', () => {
    expect(bgOf(pack, 'cafe', '周五 22:15')).toBe(bgOf(pack, 'cafe', '周六 10:30'))
    expect(bgOf(pack, 'cafe')).toBeTruthy()
    expect(bgOf(pack, '火星')).toBe('')
  })
  it('时间换算：6 点到 18 点前是白天', () => {
    expect([periodOf('周五 05:59'), periodOf('周五 06:00'), periodOf('周五 17:59'), periodOf('周五 18:00'), periodOf('深夜')]).toEqual(['晚上', '白天', '白天', '晚上', '深夜'])
  })
  it('地图', () => expect(mapOf(pack)).toMatch(/\.webp$/))
})

describe('对话框配色', () => {
  it('跟着表情；认不出＝平常', () => {
    expect([toneOf('脸红'), toneOf('有点不开心'), toneOf('嗯')]).toEqual(['shy', 'sad', 'normal'])
  })
})
