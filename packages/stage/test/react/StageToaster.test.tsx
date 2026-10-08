// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StageError } from '../../src/index'
import { StageToaster } from '../../src/react'
import { withSession, setupReactTests } from './helpers'

setupReactTests()

describe('StageToaster：SDK 的结果自动弹成提示', () => {
  it('默认：读更早的 / 存档 / 图册 / 结算出错弹；发消息出错不弹（游戏自己讲）；面板改了存档弹「存档已更新」', async () => {
    const { emit, wrap } = withSession()
    render(<StageToaster />, { wrapper: wrap })
    act(() => emit({ type: 'error', op: 'save', error: new StageError('invalid', '存档不符合存档结构：hp') }))
    expect(screen.getByText('存档不符合存档结构：hp')).toBeTruthy()
    act(() => emit({ type: 'error', op: 'send', error: new StageError('busy', '她还在说') }))
    expect(screen.queryByText('她还在说')).toBeNull()
    act(() => emit({ type: 'save', state: {}, source: 'panel' }))
    expect(screen.getByText('存档已更新')).toBeTruthy()
    act(() => emit({ type: 'save', state: {}, source: 'saver' }))
    expect(screen.getAllByText('存档已更新')).toHaveLength(1) // 自动存档不弹
  })

  it('提示会自己消失；点了也能关', async () => {
    const { emit, wrap } = withSession()
    render(<StageToaster />, { wrapper: wrap })
    act(() => emit({ type: 'error', op: 'older', error: new StageError('network', '网络连接失败') }))
    act(() => void vi.advanceTimersByTime(4100))
    expect(screen.queryByText('网络连接失败')).toBeNull()
    act(() => emit({ type: 'save', state: {}, source: 'panel' }))
    fireEvent.click(screen.getByText('存档已更新'))
    expect(screen.queryByText('存档已更新')).toBeNull()
  })
})
