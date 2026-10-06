import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissToast, toast, toastStore } from '../../src/react/toast'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  toastStore.get().forEach((t) => dismissToast(t.id)) // 提示是全局的：每个用例清干净
  vi.useRealTimers()
})

describe('toast', () => {
  it('最多 3 条，新的顶掉最旧的；同一句话连着来只留一条', () => {
    for (const t of ['一', '二', '二', '三', '四']) toast(t)
    expect(toastStore.get().map((t) => t.text)).toEqual(['二', '三', '四'])
  })
  it('普通 2.5 秒、出错 4 秒后自己消失', () => {
    toast('好了', 'ok')
    toast('出错', 'error')
    vi.advanceTimersByTime(2500)
    expect(toastStore.get().map((t) => t.text)).toEqual(['出错'])
    vi.advanceTimersByTime(1500)
    expect(toastStore.get()).toEqual([])
  })
  it('订阅：变了才通知；关一条不存在的不通知；取消订阅后收不到', () => {
    const fn = vi.fn()
    const off = toastStore.subscribe(fn)
    toast('一')
    expect(fn).toHaveBeenCalledTimes(1)
    dismissToast(9999)
    expect(fn).toHaveBeenCalledTimes(1)
    off()
    toast('二')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
