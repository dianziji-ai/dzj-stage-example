import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSettingsStore } from '../src/store'
import { useTypewriter } from '../src/useTypewriter'

// 假动画帧：每帧 16ms
let now = 0
let frames: ((t: number) => void)[] = []
const step = (n = 1) => {
  for (let i = 0; i < n; i++) {
    now += 16
    const fs = frames
    frames = []
    act(() => fs.forEach((f) => f(now)))
  }
}
beforeEach(() => {
  now = 0
  frames = []
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (f: (t: number) => void) => (frames.push(f), frames.length))
  vi.stubGlobal('cancelAnimationFrame', () => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const TEXT = '一二三四五六七八九十'
const setup = (speed: 'slow' | 'normal' | 'fast' | 'instant' = 'normal', text = TEXT) => {
  const store = createSettingsStore(null)
  store.set({ textSpeed: speed })
  return { ...renderHook((p: { text: string }) => useTypewriter(p.text, store), { initialProps: { text } }), store }
}

describe('useTypewriter', () => {
  it('按速度逐字打出：标准一秒 30 字（约 6 帧 3 个字），打完 done', () => {
    const { result } = setup()
    expect(result.current).toMatchObject({ shown: '', done: false })
    step(7)
    expect(result.current.shown).toBe('一二三')
    step(40)
    expect(result.current).toMatchObject({ shown: TEXT, done: true })
  })
  it('瞬间：一下全出', () => {
    const { result } = setup('instant')
    expect(result.current).toMatchObject({ shown: TEXT, done: true })
  })
  it('finish：一下补完', () => {
    const { result } = setup('slow')
    act(() => result.current.finish())
    expect(result.current).toMatchObject({ shown: TEXT, done: true })
  })
  it('换了一句从头打；同一句变长（生成中）接着打', () => {
    const { result, rerender } = setup()
    step(7)
    rerender({ text: TEXT + '十一十二' })
    expect(result.current.shown).toBe('一二三')
    rerender({ text: '另一句' })
    expect(result.current.shown).toBe('')
  })
  it('卡了一下（帧间隔很长）也不一口气跳一大截：单帧最多算 80ms', () => {
    const { result } = setup('fast')
    now += 5000
    const fs = frames
    frames = []
    act(() => fs.forEach((f) => f(now)))
    expect(Array.from(result.current.shown).length).toBeLessThanOrEqual(6)
  })
})
