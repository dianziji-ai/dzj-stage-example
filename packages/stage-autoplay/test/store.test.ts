import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PREFS } from '../src/core'
import { autoPlayStore, createAutoPlayStore, STORAGE_KEY } from '../src/store'

const fake = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init))
  return { getItem: (k: string) => m.get(k) ?? null, setItem: vi.fn((k: string, v: string) => void m.set(k, v)), m }
}

describe('store', () => {
  it('读本机存的设置；没有 / 坏了就用默认', () => {
    expect(createAutoPlayStore(fake({ [STORAGE_KEY]: '{"on":true,"perChar":60}' })).get()).toEqual({ ...DEFAULT_PREFS, on: true, perChar: 60 })
    expect(createAutoPlayStore(fake({ [STORAGE_KEY]: '{坏的' })).get()).toEqual(DEFAULT_PREFS)
    expect(createAutoPlayStore(null).get()).toEqual(DEFAULT_PREFS)
  })
  it('改了就存、通知订阅的；没变不通知、不写', () => {
    const s = fake()
    const st = createAutoPlayStore(s)
    const fn = vi.fn()
    const off = st.subscribe(fn)
    st.set({ on: true })
    expect(st.get().on).toBe(true)
    expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toEqual({ ...DEFAULT_PREFS, on: true })
    expect(fn).toHaveBeenCalledTimes(1)
    st.set({ on: true })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(s.setItem).toHaveBeenCalledTimes(1)
    off()
    st.set({ on: false })
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it('写不进（隐私模式）也照常生效', () => {
    const st = createAutoPlayStore({ getItem: () => null, setItem: () => { throw new Error('quota') } })
    st.set({ pause: 500 })
    expect(st.get().pause).toBe(500)
  })
  it('设置值越界时夹回范围再存', () => {
    const st = createAutoPlayStore(fake())
    st.set({ perChar: 9999 })
    expect(st.get().perChar).toBe(250)
  })
  it('默认 store 用 localStorage', () => {
    expect(autoPlayStore.get()).toEqual(DEFAULT_PREFS)
  })
})
