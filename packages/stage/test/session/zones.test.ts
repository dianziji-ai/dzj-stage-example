import { describe, expect, it } from 'vitest'
import { zoneData, zoneList, zoneNum, zoneText, type StageZones } from '../../src/index'

const z: StageZones = {
  status: { label: '状态', type: 'data', value: { 好感变化: 3, 降: '-2', 加: '+5', 心情: ' 兴奋 ', 坏: 'abc', 空: '' } },
  thought: { label: '心声', type: 'data', value: { 心声: '今天也想和你待久一点' } },
  narrative: { label: '正文', type: 'narrative', value: '她笑了。' },
  action: { label: '选项', type: 'action', value: ['敲门', '  ', ' 离开 '] },
  weird: { label: '怪', type: 'data', value: ['不是对象'] },
}

describe('安全取值', () => {
  it('数字：数字和「+5」「-2」字符串都认；没写 / 不是数字 / 空 → null', () => {
    expect(zoneNum(z, 'status', '好感变化')).toBe(3)
    expect(zoneNum(z, 'status', '降')).toBe(-2)
    expect(zoneNum(z, 'status', '加')).toBe(5)
    expect(zoneNum(z, 'status', '坏')).toBeNull()
    expect(zoneNum(z, 'status', '空')).toBeNull()
    expect(zoneNum(z, 'status', '没有这行')).toBeNull()
    expect(zoneNum(z, 'game', '硬币')).toBeNull() // 这一轮没写这个区
  })
  it('文字：去首尾空白；不给 key 取正文；没写 → 空字符串', () => {
    expect(zoneText(z, 'status', '心情')).toBe('兴奋')
    expect(zoneText(z, 'thought', '心声')).toBe('今天也想和你待久一点')
    expect(zoneText(z, 'narrative')).toBe('她笑了。')
    expect(zoneText(z, 'thought')).toBe('') // 数据区不给 key：不是文字区
    expect(zoneText(z, 'nope', 'x')).toBe('')
  })
  it('选项：去掉空的；数据区整块：不是对象 → {}', () => {
    expect(zoneList(z, 'action')).toEqual(['敲门', '离开'])
    expect(zoneList(z, 'status')).toEqual([])
    expect(zoneData(z, 'weird')).toEqual({})
    expect(zoneData(z, 'nope')).toEqual({})
  })
})
