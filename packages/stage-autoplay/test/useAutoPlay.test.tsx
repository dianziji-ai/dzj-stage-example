import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutoPlayStore } from '../src/store'
import { useAutoPlay, type UseAutoPlayOptions } from '../src/useAutoPlay'

// 「你好世界」4 个字 × 100 + 1000 ＝ 1400 毫秒
const TEXT = '你好，世界！'
const setup = (over: Partial<UseAutoPlayOptions> = {}, on = true) => {
  const store = createAutoPlayStore(null)
  store.set({ on, perChar: 100, pause: 1000 })
  const onNext = vi.fn()
  const r = renderHook((p: Partial<UseAutoPlayOptions>) => useAutoPlay({ text: TEXT, canAdvance: true, onNext, store, ...over, ...p }), { initialProps: {} })
  return { ...r, onNext, store }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useAutoPlay', () => {
  it('到点翻一次：字数 × 每字 + 句末停顿', () => {
    const { result, onNext } = setup()
    expect(result.current).toMatchObject({ on: true, running: true, duration: 1400 })
    act(() => vi.advanceTimersByTime(1399))
    expect(onNext).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onNext).toHaveBeenCalledTimes(1)
  })
  it('关着不翻；打开开关才开始计时', () => {
    const { result, onNext } = setup({}, false)
    expect(result.current.running).toBe(false)
    act(() => vi.advanceTimersByTime(5000))
    expect(onNext).not.toHaveBeenCalled()
    act(() => result.current.toggle())
    expect(result.current.on).toBe(true)
    act(() => vi.advanceTimersByTime(1400))
    expect(onNext).toHaveBeenCalledTimes(1)
  })
  it('没有下一句（最后一句 / AI 还没写出来）原地等；下一句来了才开始计时', () => {
    const { result, rerender, onNext } = setup({ canAdvance: false })
    expect(result.current.running).toBe(false)
    act(() => vi.advanceTimersByTime(10_000))
    expect(onNext).not.toHaveBeenCalled()
    rerender({ canAdvance: true })
    act(() => vi.advanceTimersByTime(1400))
    expect(onNext).toHaveBeenCalledTimes(1)
  })
  it('舞台要暂停时不翻；恢复后从头计时', () => {
    const { rerender, onNext } = setup()
    act(() => vi.advanceTimersByTime(1000))
    rerender({ paused: true })
    act(() => vi.advanceTimersByTime(5000))
    expect(onNext).not.toHaveBeenCalled()
    rerender({ paused: false })
    act(() => vi.advanceTimersByTime(1399))
    expect(onNext).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onNext).toHaveBeenCalledTimes(1)
  })
  it('换了一句（玩家自己翻页也算）从头计时，环的 key 也换', () => {
    const { result, rerender, onNext } = setup()
    const k = result.current.cycle
    act(() => vi.advanceTimersByTime(1000))
    rerender({ text: '下一句' })
    expect(result.current.cycle).not.toBe(k)
    act(() => vi.advanceTimersByTime(1299))
    expect(onNext).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onNext).toHaveBeenCalledTimes(1)
  })
  it('舞台每次渲染都新建 onNext：不重新计时，到点调最新的那个', () => {
    const { rerender, onNext } = setup()
    act(() => vi.advanceTimersByTime(1000))
    const latest = vi.fn()
    rerender({ onNext: latest })
    act(() => vi.advanceTimersByTime(400))
    expect(onNext).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledTimes(1)
  })
  it('切到别的标签页暂停，回来从头计时', () => {
    const { onNext } = setup()
    const vis = (v: 'hidden' | 'visible') => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v })
      act(() => void document.dispatchEvent(new Event('visibilitychange')))
    }
    vis('hidden')
    act(() => vi.advanceTimersByTime(5000))
    expect(onNext).not.toHaveBeenCalled()
    vis('visible')
    act(() => vi.advanceTimersByTime(1400))
    expect(onNext).toHaveBeenCalledTimes(1)
  })
})
