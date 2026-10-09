import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SettingsPanel from '../src/SettingsPanel'
import { createSettingsStore } from '../src/store'

afterEach(cleanup)

describe('SettingsPanel', () => {
  it('五项都能调：文本速度 / 字号 / 减少动画 / 选项行为 / 自动播放（开关 + 翻页节奏）', () => {
    const store = createSettingsStore(null)
    const { getByRole, getByText, queryByRole } = render(<SettingsPanel store={store} className="y" />)
    fireEvent.click(getByRole('radio', { name: '瞬间' }))
    fireEvent.click(getByRole('radio', { name: '大' }))
    fireEvent.click(getByRole('switch', { name: '减少动画' }))
    fireEvent.click(getByRole('radio', { name: '直接发送' }))
    expect(store.get()).toMatchObject({ textSpeed: 'instant', fontSize: 'large', motion: 'reduced', choiceMode: 'send' })
    getByText('点了直接发出去')
    expect(getByRole('radio', { name: '瞬间' }).getAttribute('aria-checked')).toBe('true')
    // 自动播放关着：节奏不显示；开了才有，选一档同时定每字停留和句末停顿
    expect(queryByRole('radiogroup', { name: '翻页节奏' })).toBeNull()
    fireEvent.click(getByRole('switch', { name: '自动翻到下一句' }))
    const pace = within(getByRole('radiogroup', { name: '翻页节奏' }))
    expect(pace.getByRole('radio', { name: '标准' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(pace.getByRole('radio', { name: '快' }))
    expect(store.get().autoPlay).toEqual({ on: true, perChar: 50, pause: 800 })
    expect(queryByRole('slider')).toBeNull()
  })
  it('sections：只显示舞台支持的几节', () => {
    const { queryByText, getByText } = render(<SettingsPanel store={createSettingsStore(null)} sections={['text', 'auto']} />)
    getByText('文本速度')
    getByText('自动播放')
    expect(queryByText('字号')).toBeNull()
    expect(queryByText('选项')).toBeNull()
  })
})

describe('SettingsPanel · 配音（0.2.0）', () => {
  it('默认不显示；sections 写上 voice 才有：开关，开了才出音量和两个上限', () => {
    const store = createSettingsStore(null)
    const { queryByText, unmount } = render(<SettingsPanel store={store} />)
    expect(queryByText('角色台词念出来')).toBeNull()
    unmount()
    const { getByRole, queryByRole, queryByText: q } = render(<SettingsPanel store={store} sections={['voice']} />)
    expect(queryByRole('slider')).toBeNull()
    fireEvent.click(getByRole('switch', { name: '角色台词念出来' }))
    expect(q('一句最多念')).not.toBeNull() // 开了才出：音量 + 两个上限
    fireEvent.change(getByRole('slider'), { target: { value: '40' } })
    fireEvent.click(within(getByRole('radiogroup', { name: '一句最多念' })).getByRole('radio', { name: '150 字' }))
    fireEvent.click(within(getByRole('radiogroup', { name: '一轮最多念' })).getByRole('radio', { name: '不限' }))
    expect(store.get().voice).toEqual({ on: true, volume: 40, maxLine: 150, maxTurn: 0 })
  })
  it('开着配音 + 自动播放：不显示翻页节奏，改成一句说明', () => {
    const store = createSettingsStore(null)
    store.set({ voice: { on: true }, autoPlay: { on: true } })
    const { queryByRole, getByText } = render(<SettingsPanel store={store} sections={['auto', 'voice']} />)
    expect(queryByRole('radiogroup', { name: '翻页节奏' })).toBeNull()
    getByText('开着配音：她念完这句就翻下一句。')
  })
})

describe('SettingsPanel · 音效（0.2.0）', () => {
  it('sections 写上 sfx 才有：开关默认开，音量能调；关了音量收起', () => {
    const store = createSettingsStore(null)
    const { getByRole, queryByRole } = render(<SettingsPanel store={store} sections={['sfx']} />)
    fireEvent.change(getByRole('slider'), { target: { value: '70' } })
    expect(store.get().sfx).toEqual({ on: true, volume: 70 })
    fireEvent.click(getByRole('switch', { name: '按钮和操作的音效' }))
    expect(store.get().sfx.on).toBe(false)
    expect(queryByRole('slider')).toBeNull()
  })
})
