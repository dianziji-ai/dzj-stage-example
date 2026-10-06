import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { closeStagePanel, openStagePanel, StagePanel } from '../src/index'
import { fakeStage, setupPanelTests } from './helpers'

setupPanelTests()

describe('StagePanel（入口）', () => {
  it('默认右下角一颗「本局」按钮；点了打开面板（第一次打开才下载），打开时按钮藏起来', async () => {
    render(<StagePanel stage={fakeStage()} />)
    const btn = screen.getByRole('button', { name: '本局' })
    expect(btn.className).toContain('right-3 bottom-3')
    fireEvent.pointerEnter(btn) // 指上去就开始下载
    fireEvent.click(btn)
    expect(await screen.findByRole('dialog', { name: '本局' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '本局' })).toBeNull()
    act(closeStagePanel)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('标题、按钮位置可以改；button=false 不要按钮，用 openStagePanel() 自己开', async () => {
    const { rerender } = render(<StagePanel stage={fakeStage()} title="存档与记录" buttonClassName="left-3 top-20" />)
    expect(screen.getByRole('button', { name: '存档与记录' }).className).toContain('left-3 top-20')
    rerender(<StagePanel stage={fakeStage()} button={false} />)
    expect(screen.queryByRole('button', { name: '本局' })).toBeNull()
    act(openStagePanel)
    expect(await screen.findByRole('dialog', { name: '本局' })).toBeTruthy()
    act(closeStagePanel)
  })
})
