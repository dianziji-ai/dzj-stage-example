import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SettingsPanel from '../src/SettingsPanel'
import { createSettingsStore } from '../src/store'

afterEach(cleanup)

describe('SettingsPanel', () => {
  it('五项都能调：文本速度 / 字号 / 动效 / 选项行为 / 自动播放', () => {
    const store = createSettingsStore(null)
    const { getByRole, getAllByRole, getByText } = render(<SettingsPanel store={store} className="y" />)
    fireEvent.click(getByRole('radio', { name: '瞬间' }))
    fireEvent.click(getByRole('radio', { name: '大' }))
    fireEvent.click(getByRole('radio', { name: '减少' }))
    fireEvent.click(getByRole('radio', { name: '直接发送' }))
    expect(store.get()).toMatchObject({ textSpeed: 'instant', fontSize: 'large', motion: 'reduced', choiceMode: 'send' })
    getByText('点了直接发出去')
    expect(getByRole('radio', { name: '瞬间' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(getByRole('switch'))
    const [perChar, pause] = getAllByRole('slider')
    fireEvent.change(perChar, { target: { value: '50' } })
    fireEvent.change(pause, { target: { value: '1000' } })
    expect(store.get().autoPlay).toEqual({ on: true, perChar: 50, pause: 1000 })
    getByText('50 毫秒')
    getByText(/约停 2\.5 秒/)
  })
  it('sections：只显示舞台支持的几节', () => {
    const { queryByText, getByText } = render(<SettingsPanel store={createSettingsStore(null)} sections={['text', 'auto']} />)
    getByText('文本速度')
    getByText('自动播放')
    expect(queryByText('字号')).toBeNull()
    expect(queryByText('选项')).toBeNull()
  })
})
