import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { closeStagePanel, openStagePanel, toggleStagePanel, useStagePanelOpen } from '../src/store'
import { setupPanelTests } from './helpers'

setupPanelTests()

describe('面板开关（全局）', () => {
  it('open / close / toggle；任何地方开，用到的组件都跟着变', () => {
    const { result } = renderHook(() => useStagePanelOpen())
    expect(result.current).toBe(false)
    act(openStagePanel)
    expect(result.current).toBe(true)
    act(openStagePanel) // 重复开不出事
    act(toggleStagePanel)
    expect(result.current).toBe(false)
    act(toggleStagePanel)
    act(closeStagePanel)
    expect(result.current).toBe(false)
  })
})
