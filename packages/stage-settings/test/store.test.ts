import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../src/core'
import { createSettingsStore, settingsStore, STORAGE_KEY } from '../src/store'

const fake = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init))
  return { getItem: (k: string) => m.get(k) ?? null, setItem: vi.fn((k: string, v: string) => void m.set(k, v)), m }
}

describe('store', () => {
  it('读本机存的设置；没有 / 坏了就用默认', () => {
    expect(createSettingsStore(fake({ [STORAGE_KEY]: '{"textSpeed":"fast","autoPlay":{"on":true}}' })).get()).toEqual({ ...DEFAULT_SETTINGS, textSpeed: 'fast', autoPlay: { ...DEFAULT_SETTINGS.autoPlay, on: true } })
    expect(createSettingsStore(fake({ [STORAGE_KEY]: '{坏的' })).get()).toEqual(DEFAULT_SETTINGS)
    expect(createSettingsStore(null).get()).toEqual(DEFAULT_SETTINGS)
  })
  it('改了就存、通知；autoPlay 只给一项也行；没变不通知、不写', () => {
    const s = fake()
    const st = createSettingsStore(s)
    const fn = vi.fn()
    const off = st.subscribe(fn)
    st.set({ autoPlay: { on: true } })
    expect(st.get().autoPlay).toEqual({ ...DEFAULT_SETTINGS.autoPlay, on: true })
    st.set({ fontSize: 'large' })
    expect(JSON.parse(s.m.get(STORAGE_KEY)!).fontSize).toBe('large')
    expect(fn).toHaveBeenCalledTimes(2)
    st.set({ fontSize: 'large' })
    expect(s.setItem).toHaveBeenCalledTimes(2)
    off()
    st.set({ motion: 'reduced' })
    expect(fn).toHaveBeenCalledTimes(2)
  })
  it('写不进（隐私模式）也照常生效', () => {
    const st = createSettingsStore({ getItem: () => null, setItem: () => { throw new Error('quota') } })
    st.set({ choiceMode: 'send' })
    expect(st.get().choiceMode).toBe('send')
  })
  it('默认 store 用 localStorage', () => {
    expect(settingsStore.get()).toEqual(DEFAULT_SETTINGS)
  })
})
