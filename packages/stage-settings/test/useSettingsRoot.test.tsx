import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createSettingsStore } from '../src/store'
import { useSettingsRoot } from '../src/useSettingsRoot'

describe('useSettingsRoot', () => {
  it('字号 / 动效写到根节点：CSS 变量 + data 属性；改了跟着变', () => {
    const store = createSettingsStore(null)
    const root = document.createElement('div')
    renderHook(() => useSettingsRoot(store, root))
    expect(root.style.getPropertyValue('--dzj-font-scale')).toBe('1')
    expect(root.dataset.dzjFont).toBe('normal')
    expect(root.dataset.dzjMotion).toBe('full')
    act(() => store.set({ fontSize: 'large', motion: 'reduced' }))
    expect(root.style.getPropertyValue('--dzj-font-scale')).toBe('1.2')
    expect(root.dataset.dzjMotion).toBe('reduced')
  })
  it('没有根节点不出错；默认写 <html>', () => {
    renderHook(() => useSettingsRoot(createSettingsStore(null), null))
    renderHook(() => useSettingsRoot())
    expect(document.documentElement.dataset.dzjFont).toBe('normal')
  })
})
