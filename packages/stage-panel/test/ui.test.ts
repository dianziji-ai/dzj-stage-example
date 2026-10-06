import { afterEach, describe, expect, it, vi } from 'vitest'
import { clock, initialOf, shortModel, tokens } from '../src/ui'

afterEach(() => vi.useRealTimers())

describe('面板小工具', () => {
  it('shortModel：去掉厂商前缀；没有＝—', () => {
    expect(shortModel('deepseek/deepseek-v3.2')).toBe('deepseek-v3.2')
    expect(shortModel('gpt-4o')).toBe('gpt-4o')
    expect(shortModel(null)).toBe('—')
    expect(shortModel('')).toBe('—')
  })
  it('tokens：千以上写成 k', () => {
    expect(tokens(999)).toBe('999')
    expect(tokens(5820)).toBe('5.8k')
  })
  it('clock：今天的只给时分，别的日子带月-日', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 6, 15, 0))
    expect(clock(new Date(2026, 9, 6, 9, 5).toISOString())).not.toMatch(/-/)
    expect(clock(new Date(2026, 8, 30, 9, 5).toISOString())).toMatch(/^9-30 /)
  })
  it('initialOf：开局存档＝各字段的 default（没有 default 的不出现）', () => {
    expect(initialOf({ type: 'object', properties: { love: { default: 20 }, mood: { type: 'string' }, bag: { default: [] } } })).toEqual({ love: 20, bag: [] })
    expect(initialOf({ type: 'object' })).toEqual({})
  })
})
