import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { preloadImages } from '../../src/react/preload'

/** 假 Image：地址里带 bad 解码失败、带 slow 永远解不完，其余马上解完 */
const loaded: string[] = []
class FakeImage {
  decoding = ''
  src = ''
  decode() {
    loaded.push(this.src)
    if (this.src.includes('bad')) return Promise.reject(new Error('坏图'))
    if (this.src.includes('slow')) return new Promise<void>(() => {})
    return Promise.resolve()
  }
}

beforeEach(() => {
  loaded.length = 0
  vi.stubGlobal('Image', FakeImage)
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('preloadImages', () => {
  it('去重、跳过空地址；进度从 0 报到全部', async () => {
    const progress: [number, number][] = []
    await preloadImages(['a.webp', '', 'a.webp', 'b.webp'], (d, t) => progress.push([d, t]))
    expect(loaded).toEqual(['a.webp', 'b.webp'])
    expect(progress).toEqual([[0, 2], [1, 2], [2, 2]])
  })
  it('坏图不卡启动：照样算完成', async () => {
    const done = vi.fn()
    await preloadImages(['bad.webp', 'ok.webp'], done)
    expect(done).toHaveBeenLastCalledWith(2, 2)
  })
  it('单张最多等 5 秒：超时算完成，只算一次', async () => {
    const progress = vi.fn()
    const p = preloadImages(['slow.webp'], progress)
    await vi.advanceTimersByTimeAsync(4999)
    expect(progress).toHaveBeenCalledTimes(1) // 只有开头的 0/1
    await vi.advanceTimersByTimeAsync(1)
    await p
    expect(progress).toHaveBeenLastCalledWith(1, 1)
    expect(progress).toHaveBeenCalledTimes(2)
  })
  it('没有图：立刻完成', async () => {
    const progress = vi.fn()
    await preloadImages([], progress)
    expect(progress).toHaveBeenCalledWith(0, 0)
  })
})
