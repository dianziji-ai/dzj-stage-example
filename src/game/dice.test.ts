import { describe, expect, it } from 'vitest'
import { ATTRS, checkState, diffOfCat, DIFFS, favorBonus, natureOf, outcomeOf, PRESET_CATS, PRESETS, rollD100, searchPresets, targetOf } from './dice'
import { splitState, withState } from '@dianziji/stage'
import { PLACES } from './content'

describe('行动检定', () => {
  it('目标值＝难度基础 + 好感每 10 点 +3，限制在 15～95', () => {
    expect(targetOf('普通', 0)).toBe(55)
    expect(targetOf('普通', 20)).toBe(61)
    expect(targetOf('简单', 25)).toBe(81)
    expect(targetOf('简单', 100)).toBe(95) // 封顶
    expect(targetOf('极难', 0)).toBe(15) // 保底
    expect(favorBonus(-5)).toBe(0)
  })
  it('掷骰在 1～100', () => {
    for (let i = 0; i < 500; i++) {
      const n = rollD100()
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(100)
    }
  })
  it('演出四档：大成功 / 成功 / 失败 / 大失败', () => {
    expect(outcomeOf(3, 40)).toBe('crit')
    expect(outcomeOf(40, 40)).toBe('success')
    expect(outcomeOf(41, 40)).toBe('fail')
    expect(outcomeOf(97, 40)).toBe('fumble')
  })
  it('检定作为 <dj_state> 附在这句话后面：话本身干净，首行是约定的那句，六项齐全', () => {
    const raw = withState('趁她不注意偷吃她的布丁', checkState({ action: '偷吃她的布丁', attr: '手速', diff: '普通', target: 55, roll: 78, nature: 'prank' }))
    const { text, state } = splitState(raw)
    expect(text).toBe('趁她不注意偷吃她的布丁')
    expect(state.startsWith('【行动检定】玩家已在界面上掷骰，结果已定，照着演、不重掷不改判。')).toBe(true)
    expect(state).toContain('\n行动: 偷吃她的布丁\n属性: 手速\n难度: 普通\n目标: 55\n掷骰: 78\n结果: 失败')
    // 行动里的换行 / 冒号会打乱「键: 值」：换成空格
    expect(checkState({ action: '告诉她：有你真好\n', attr: '勇气', diff: '极难', target: 33, roll: 50, nature: 'warm' })).toContain('行动: 告诉她 有你真好\n')
  })
})

describe('行动性质：善意失败不扣好感，恶作剧失败扣 1～3', () => {
  it('日常 / 心动 / 没选分类＝对她好；恶作剧＝恶作剧', () => {
    expect(natureOf('日常')).toBe('warm')
    expect(natureOf('心动')).toBe('warm')
    expect(natureOf(null)).toBe('warm')
    expect(natureOf('恶作剧')).toBe('prank')
    expect(diffOfCat('日常')).toBe('简单')
    expect(diffOfCat(null)).toBe('普通')
  })
  it('发给 AI 的说明按性质分开（和卡里检定区的规则同一套话）', () => {
    const warmFail = checkState({ action: '扶正她的小鸡帽', attr: '体贴', diff: '简单', target: 81, roll: 90, nature: 'warm' })
    expect(warmFail).toContain('绝不扣分')
    expect(warmFail).toContain('结果: 失败')
    const prankFail = checkState({ action: '藏起她的小鸡帽', attr: '手速', diff: '普通', target: 61, roll: 80, nature: 'prank' })
    expect(prankFail).toContain('被她当场抓包，她鼓着腮闹别扭，好感按难度扣 1～3')
    expect(checkState({ action: '夸她', attr: '撒娇力', diff: '普通', target: 58, roll: 2, nature: 'warm' })).toContain('大成功')
    expect(checkState({ action: '吓她', attr: '撒娇力', diff: '困难', target: 41, roll: 99, nature: 'prank' })).toContain('抓了个正着')
  })
})

describe('预设行动', () => {
  it('按分类筛、按词搜（行动文字 / 标签 / 属性都算），多个词要同时命中', () => {
    expect(searchPresets('', '恶作剧').every((p) => p.cat === '恶作剧')).toBe(true)
    expect(searchPresets('布丁').length).toBeGreaterThanOrEqual(2)
    expect(searchPresets('布丁 偷吃')).toHaveLength(1)
    expect(searchPresets('手速 抓娃娃')[0].text).toContain('抓')
    expect(searchPresets('没有这个')).toEqual([])
  })
  it('每条预设的属性 / 难度 / 分类都在表里；三个分类都有', () => {
    for (const p of PRESETS) {
      expect(ATTRS.some((a) => a.id === p.attr)).toBe(true)
      expect(DIFFS.some((d) => d.id === p.diff)).toBe(true)
      expect(PRESET_CATS).toContain(p.cat)
    }
    for (const c of PRESET_CATS) expect(PRESETS.some((p) => p.cat === c)).toBe(true)
  })
  it('六个地点都有能搜到的预设（标签里写了地点 id）', () => {
    for (const pl of PLACES.filter((x) => x.id !== 'home')) expect(searchPresets(pl.id).length).toBeGreaterThan(0)
  })
})
