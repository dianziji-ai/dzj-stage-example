import { describe, expect, it } from 'vitest'
import { countChars, DEFAULT_PREFS, delayFor, LIMITS, MAX_DELAY_MS, normalizePrefs } from '../src/core'

describe('countChars：只数要读的字', () => {
  it('中文、英文、数字都算；空白和标点不算', () => {
    expect(countChars('你好，世界！')).toBe(4)
    expect(countChars('「才、才没有呢……」')).toBe(5)
    expect(countChars('OK 123')).toBe(5)
    expect(countChars('  ——！？  ')).toBe(0)
    expect(countChars('')).toBe(0)
  })
})

describe('delayFor：句末停顿 + 字数 × 每字停留，最多 12 秒', () => {
  it('按公式算', () => {
    expect(delayFor('你好，世界！', { perChar: 100, pause: 1000 })).toBe(1400)
    expect(delayFor('', DEFAULT_PREFS)).toBe(DEFAULT_PREFS.pause)
  })
  it('再长也不超过上限', () => {
    expect(delayFor('字'.repeat(1000), { perChar: 250, pause: 5000 })).toBe(MAX_DELAY_MS)
  })
})

describe('normalizePrefs：读回来的设置过一遍', () => {
  it('缺的补默认、类型不对的丢掉', () => {
    expect(normalizePrefs(null)).toEqual(DEFAULT_PREFS)
    expect(normalizePrefs({ on: 'yes', perChar: '50', pause: Number.NaN })).toEqual(DEFAULT_PREFS)
    expect(normalizePrefs({ on: true })).toEqual({ ...DEFAULT_PREFS, on: true })
  })
  it('越界的夹回范围、小数取整', () => {
    expect(normalizePrefs({ perChar: 1, pause: 99999 })).toEqual({ ...DEFAULT_PREFS, perChar: LIMITS.perChar.min, pause: LIMITS.pause.max })
    expect(normalizePrefs({ perChar: 88.6 }).perChar).toBe(89)
  })
})
