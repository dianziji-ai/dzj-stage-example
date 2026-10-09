import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createSettingsStore } from '../src/store'
import { useSettings } from '../src/useSettings'

describe('useSettings', () => {
  it('读设置；store 一变就重画', () => {
    const store = createSettingsStore(null)
    const { result } = renderHook(() => useSettings(store))
    expect(result.current[0].textSpeed).toBe('normal')
    act(() => result.current[1]({ textSpeed: 'slow' }))
    expect(result.current[0].textSpeed).toBe('slow')
  })
})
