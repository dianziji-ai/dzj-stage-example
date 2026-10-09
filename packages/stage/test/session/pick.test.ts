import { describe, expect, it } from 'vitest'
import { imageTags, imageVocab, pickImage } from '../../src/session/pick'

const img = (n: number, ...g: string[]) => ({ n, src: `https://x/${n}.webp`, g })
const snap = {
  image_pack: {
    groups: [],
    images: [
      img(1, '立绘/电子姬/平常'),
      img(2, '立绘/电子姬/开心'),
      img(3, '立绘/电子姬/害羞'),
      img(4, '立绘/电子姬/睡衣/开心'),
      img(5, '立绘/电子姬/睡衣/害羞'),
      img(6, '立绘/妹妹/平常'),
      img(7, '立绘/妹妹/开心'),
      img(8, '背景/电玩城'),
      img(9, '背景/电玩城/晚上'),
      img(10, '背景/公园'),
      img(11, 'CG'), // 老卡的普通组：没有类别段的不算立绘
      img(12, '立绘/电子姬/伤心'),
      img(13, '立绘/电子姬/伤心'), // 同标签两张：按 seed 轮换
    ],
  },
}
const n = (x: ReturnType<typeof pickImage>) => x?.n ?? null
const who = (v: unknown) => ({ value: v, must: true })

describe('imageTags / imageVocab', () => {
  it('分组名按「/」拆：第一段是类别，后面是标签；多个组合并', () => {
    expect(imageTags({ g: ['立绘/电子姬/睡衣', '立绘/电子姬/开心', '背景/家'] }, '立绘')).toEqual(['电子姬', '睡衣', '开心'])
    expect(imageTags({ g: ['背景/家'] }, '立绘')).toBeNull()
    expect(imageTags({ g: ['立绘'] }, '立绘')).toEqual([])
  })
  it('词表：这个类别下出现过的全部标签', () => {
    expect(imageVocab(snap, '背景')).toEqual(['电玩城', '晚上', '公园'])
  })
})

describe('pickImage', () => {
  it('全对上：谁 + 表情', () => {
    expect(n(pickImage(snap, '立绘', [who('电子姬'), { value: '害羞' }]))).toBe(3)
    expect(n(pickImage(snap, '立绘', [who('妹妹'), { value: '开心' }]))).toBe(7)
  })
  it('没写的维度挑最朴素的那张（多余标签最少）：没写穿着 → 不是睡衣那张', () => {
    expect(n(pickImage(snap, '立绘', [who('电子姬'), { value: '' }, { value: '开心' }]))).toBe(2)
    expect(n(pickImage(snap, '立绘', [who('电子姬'), { value: '睡衣' }, { value: '开心' }]))).toBe(4)
  })
  it('重要的维度先比：要「睡衣·平常」，睡衣没有平常那张', () => {
    // 穿着在前：留在睡衣里（开心 / 害羞 同分，按 seed 固定一张）
    expect([4, 5]).toContain(n(pickImage(snap, '立绘', [who('电子姬'), { value: '睡衣' }, { value: '平常' }])))
    // 表情在前：换回平常那张
    expect(n(pickImage(snap, '立绘', [who('电子姬'), { value: '平常' }, { value: '睡衣' }]))).toBe(1)
  })
  it('词里包含标签就认：「有点害羞」→ 害羞；包含得越长越准：「有点不开心」认近义词「不开心」而不是「开心」', () => {
    expect(n(pickImage(snap, '立绘', [who('电子姬'), { value: '有点害羞' }]))).toBe(3)
    const p = { image_pack: { groups: [], images: [img(1, '立绘/开心|笑'), img(2, '立绘/伤心|不开心|难过')] } }
    expect(n(pickImage(p, '立绘', [{ value: '有点不开心' }]))).toBe(2)
    expect(n(pickImage(p, '立绘', [{ value: '笑' }]))).toBe(1)
  })
  it('近义词＝替补：真正标着那个词的图优先，没有才退到列着它的（越靠前越优先）', () => {
    const p = {
      image_pack: {
        groups: [],
        images: [img(1, '立绘/日常/害羞'), img(2, '立绘/性爱/迷离|害羞|哭泣'), img(3, '立绘/性爱/享受|开心'), img(4, '立绘/性爱/高潮|哭泣')],
      },
    }
    expect(n(pickImage(p, '立绘', [{ value: '日常' }, { value: '害羞' }]))).toBe(1)
    expect(n(pickImage(p, '立绘', [{ value: '性爱' }, { value: '害羞' }]))).toBe(2)
    expect(n(pickImage(p, '立绘', [{ value: '性爱' }, { value: '哭泣' }]))).toBe(4) // 高潮|哭泣 里排得更靠前
  })
  it('近义词：同一个组名写在多个组里，近义词合并', () => {
    expect(imageTags({ g: ['立绘/开心|笑', '立绘/开心|高兴'] }, '立绘')).toEqual(['开心'])
  })
  it('带键的标签只和同键的维度比：动作里写了「开心」不会被当成表情', () => {
    const p = {
      image_pack: {
        groups: [],
        images: [img(1, '立绘/穿着=卫衣/表情=开心'), img(2, '立绘/穿着=睡衣/表情=害羞'), img(3, '立绘/穿着=睡衣/表情=开心'), img(4, '立绘/穿着=卫衣/动作=打游戏|手柄/表情=开心')],
      },
    }
    const dims = (act: string, wear: string, expr: string) => [{ value: act, key: '动作' }, { value: wear, key: '穿着' }, { value: expr, key: '表情' }]
    expect(n(pickImage(p, '立绘', dims('开心地转了个圈', '睡衣', '害羞')))).toBe(2)
    expect(n(pickImage(p, '立绘', dims('握紧手柄', '睡衣', '开心')))).toBe(4) // 动作排最前：打游戏那张只有卫衣，照样挑它
    expect(n(pickImage(p, '立绘', dims('', '卫衣', '开心')))).toBe(1) // 没写动作：不挑多一个动作标签的
    expect(imageVocab(p, '立绘', '表情')).toEqual(['开心', '害羞'])
    expect(imageTags(p.image_pack.images[3], '立绘')).toEqual(['穿着=卫衣', '动作=打游戏', '表情=开心'])
  })
  it('「默认」组：没写、又没有上一张时优先；写了的维度照样排在它前面', () => {
    const p = { image_pack: { groups: [], images: [img(1, '立绘/睡衣/开心'), img(2, '立绘/卫衣/开心', '立绘/默认'), img(3, '立绘/睡衣/害羞')] } }
    expect(n(pickImage(p, '立绘', [{ value: '' }, { value: '开心' }], { seed: 1 }))).toBe(2)
    expect(n(pickImage(p, '立绘', [{ value: '睡衣' }, { value: '开心' }]))).toBe(1)
    expect(n(pickImage(p, '立绘', [{ value: '' }, { value: '开心' }], { prev: 3 }))).toBe(1) // 上一张更重要：留在睡衣
  })
  it('没写 / 认不出的维度：留在和上一张同一套（prev）', () => {
    const prev = 4 // 睡衣·开心
    expect(n(pickImage(snap, '立绘', [who('电子姬'), { value: '' }, { value: '害羞' }], { prev }))).toBe(5)
    expect(n(pickImage(snap, '立绘', [who('电子姬'), { value: '比基尼' }, { value: '害羞' }], { prev }))).toBe(5)
    expect(n(pickImage(snap, '立绘', [who('电子姬'), { value: '' }, { value: '害羞' }], { prev: 1 }))).toBe(3)
  })
  it('must 维度写了却对不上 → null（调用方沿用上一张）；没写不限制', () => {
    expect(pickImage(snap, '立绘', [who('路人'), { value: '开心' }])).toBeNull()
    expect([2, 7]).toContain(n(pickImage(snap, '立绘', [who(''), { value: '开心' }])))
  })
  it('同分多张按 seed 固定挑：同一个 seed 永远同一张，不同 seed 能轮到另一张', () => {
    const pick = (seed: string | number) => n(pickImage(snap, '立绘', [who('电子姬'), { value: '伤心' }], { seed }))
    expect(pick('这一句')).toBe(pick('这一句'))
    expect(new Set([0, 1, 2, 3].map(pick))).toEqual(new Set([12, 13]))
  })
  it('背景：地点 + 时段；时段没有专图就用通用的', () => {
    expect(n(pickImage(snap, '背景', [{ value: '电玩城', must: true }, { value: '晚上' }]))).toBe(9)
    expect(n(pickImage(snap, '背景', [{ value: '电玩城', must: true }, { value: '白天' }]))).toBe(8)
    expect(n(pickImage(snap, '背景', [{ value: '公园', must: true }, { value: '晚上' }]))).toBe(10)
  })
  it('没有这个类别 / 没配图库 → null；数字也认', () => {
    expect(pickImage(snap, '立绘2', [{ value: '开心' }])).toBeNull()
    expect(pickImage({ image_pack: null }, '立绘', [])).toBeNull()
    expect(n(pickImage({ image_pack: { groups: [], images: [img(1, '背景/1号房')] } }, '背景', [{ value: 1 }]))).toBe(1)
  })
})
