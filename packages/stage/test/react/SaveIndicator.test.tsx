// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SaveIndicator } from '../../src/react'
import { withSession, setupReactTests } from './helpers'

setupReactTests()

describe('SaveIndicator', () => {
  it('普通模式：平时「保存」，点了手动保存，存好亮「已保存」', async () => {
    const { stage, wrap } = withSession()
    render(<SaveIndicator />, { wrapper: wrap })
    expect(screen.getByRole('button').textContent).toContain('保存')
    await act(async () => fireEvent.click(screen.getByRole('button')))
    expect(stage.save).toHaveBeenCalled()
    expect(screen.getByRole('button').textContent).toContain('已保存')
  })

  it('安静模式：平时不显示；没存上一直亮 ⚠，点了重试', async () => {
    const { session, stage, wrap, failSaves } = withSession()
    const { container } = render(<SaveIndicator quiet />, { wrapper: wrap })
    await act(async () => vi.advanceTimersByTime(3000)) // 进来那次的「已保存」亮过去
    expect(container.textContent).toBe('')
    failSaves(true)
    await act(async () => session.setSave({ love: 1 }, { now: true }))
    expect(screen.getByRole('button', { name: /没存上/ })).toBeTruthy()
    failSaves(false)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /没存上/ })))
    expect(stage.save).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button').textContent).toBe('✓')
  })
})
