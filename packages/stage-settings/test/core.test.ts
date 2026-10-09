import { describe, expect, it } from 'vitest'
import { countChars, DEFAULT_SETTINGS, delayFor, fillChoice, LIMITS, MAX_DELAY_MS, normalizeSettings, sameSettings } from '../src/core'

describe('countChars：只数要读的字', () => {
  it('中文、英文、数字都算；空白和标点不算', () => {
    expect(countChars('你好，世界！')).toBe(4)
    expect(countChars('「才、才没有呢……」')).toBe(5)
    expect(countChars('OK 123')).toBe(5)
    expect(countChars('  ——！？  ')).toBe(0)
  })
})

describe('delayFor：句末停顿 + 字数 × 每字停留，最多 12 秒', () => {
  it('按公式算；再长也不超过上限', () => {
    expect(delayFor('你好，世界！', { perChar: 100, pause: 1000 })).toBe(1400)
    expect(delayFor('', DEFAULT_SETTINGS.autoPlay)).toBe(1500)
    expect(delayFor('字'.repeat(1000), { perChar: 250, pause: 5000 })).toBe(MAX_DELAY_MS)
  })
})

describe('normalizeSettings', () => {
  it('缺的补默认；不认识的值丢掉', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings({ textSpeed: 'warp', fontSize: 9, motion: 'none', choiceMode: 'x', autoPlay: 'yes' })).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings({ textSpeed: 'fast', fontSize: 'large', motion: 'reduced', choiceMode: 'send' })).toEqual({ ...DEFAULT_SETTINGS, textSpeed: 'fast', fontSize: 'large', motion: 'reduced', choiceMode: 'send' })
  })
  it('自动播放：越界夹回范围、小数取整、类型不对用默认', () => {
    expect(normalizeSettings({ autoPlay: { on: true, perChar: 1, pause: 99999 } }).autoPlay).toEqual({ on: true, perChar: LIMITS.perChar.min, pause: LIMITS.pause.max })
    expect(normalizeSettings({ autoPlay: { on: 'y', perChar: 88.6, pause: Number.NaN } }).autoPlay).toEqual({ on: false, perChar: 89, pause: 1500 })
  })
  it('sameSettings', () => {
    expect(sameSettings(DEFAULT_SETTINGS, normalizeSettings(null))).toBe(true)
    expect(sameSettings(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, autoPlay: { ...DEFAULT_SETTINGS.autoPlay, pause: 0 } })).toBe(false)
  })
})

describe('fillChoice：填入确认模式点选项', () => {
  it('按点击顺序一行一条叠加，同一条不重复', () => {
    let r = fillChoice('', [], '去厨房')
    expect(r).toEqual({ text: '去厨房', stack: ['去厨房'] })
    r = fillChoice(r.text, r.stack, '抱住她')
    expect(r.text).toBe('去厨房\n抱住她')
    r = fillChoice(r.text, r.stack, '去厨房')
    expect(r.text).toBe('去厨房\n抱住她')
  })
  it('玩家手改过输入框：从头叠，只留这一条', () => {
    expect(fillChoice('我自己写的', ['去厨房'], '抱住她')).toEqual({ text: '抱住她', stack: ['抱住她'] })
    expect(fillChoice('写了一半', [], ' 抱住她 ')).toEqual({ text: '抱住她', stack: ['抱住她'] })
  })
})

describe('配音设置（0.2.0）', () => {
  it('默认关、音量 80、单句 80、每轮 300', () => {
    expect(DEFAULT_SETTINGS.voice).toEqual({ on: false, volume: 80, maxLine: 80, maxTurn: 300 })
    expect(normalizeSettings(null).voice).toEqual(DEFAULT_SETTINGS.voice)
  })
  it('读回来不认识的值夹回默认：音量夹进 0~100，上限只认可选值，0＝不限', () => {
    const v = normalizeSettings({ voice: { on: true, volume: 180, maxLine: 77, maxTurn: 0 } }).voice
    expect(v).toEqual({ on: true, volume: 100, maxLine: 80, maxTurn: 0 })
    expect(normalizeSettings({ voice: 'x' }).voice).toEqual(DEFAULT_SETTINGS.voice)
  })
  it('sameSettings 也比配音', () => {
    const a = normalizeSettings(null)
    expect(sameSettings(a, { ...a, voice: { ...a.voice, on: true } })).toBe(false)
  })
})

describe('翻页节奏三档（0.2.0）', () => {
  it('paceOf 取最近的一档；默认＝标准', async () => {
    const { PACES, paceOf } = await import('../src/core')
    expect(paceOf(DEFAULT_SETTINGS.autoPlay)).toBe('normal')
    expect(paceOf(PACES.fast)).toBe('fast')
    expect(paceOf({ perChar: 140, pause: 3000 })).toBe('slow')
  })
})

describe('音效设置（0.2.0）', () => {
  it('默认开、音量 50；读回来夹回范围', () => {
    expect(DEFAULT_SETTINGS.sfx).toEqual({ on: true, volume: 50 })
    expect(normalizeSettings({ sfx: { on: false, volume: -5 } }).sfx).toEqual({ on: false, volume: 0 })
    const a = normalizeSettings(null)
    expect(sameSettings(a, { ...a, sfx: { ...a.sfx, volume: 60 } })).toBe(false)
  })
})
