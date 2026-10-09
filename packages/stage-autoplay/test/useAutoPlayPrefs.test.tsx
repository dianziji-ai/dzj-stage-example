import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createAutoPlayStore } from '../src/store'
import { useAutoPlayPrefs } from '../src/useAutoPlayPrefs'

describe('useAutoPlayPrefs', () => {
  it('读设置；store 一变就重画', () => {
    const store = createAutoPlayStore(null)
    const { result } = renderHook(() => useAutoPlayPrefs(store))
    expect(result.current[0].on).toBe(false)
    act(() => result.current[1]({ on: true }))
    expect(result.current[0].on).toBe(true)
  })
})
