// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CrossfadeImage } from '../../src/react'

/** 假的 Image：decode() 由测试决定什么时候成功 / 失败 */
const pending = new Map<string, { ok: () => void; fail: () => void }>()
class FakeImage {
  decoding = ''
  src = ''
  decode() {
    return new Promise<void>((ok, fail) => pending.set(this.src, { ok, fail: () => fail(new Error('坏图')) }))
  }
}
const loaded = (src: string) => act(async () => pending.get(src)!.ok())
const broken = (src: string) => act(async () => pending.get(src)!.fail())

/** 假的 Web Animations：记下每次 animate，测试里手动「播完」 */
type Anim = { el: Element; frames: Keyframe[]; onfinish: (() => void) | null }
let anims: Anim[] = []
const finishAll = () => act(() => anims.splice(0).forEach((a) => a.onfinish?.()))

const imgs = (c: HTMLElement) => [...c.querySelectorAll('img')].map((i) => i.getAttribute('src'))

beforeEach(() => {
  pending.clear()
  anims = []
  vi.stubGlobal('Image', FakeImage)
  Element.prototype.animate = function (this: Element, frames: Keyframe[]) {
    const a: Anim = { el: this, frames, onfinish: null }
    anims.push(a)
    return a as unknown as Animation
  } as Element['animate']
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete (Element.prototype as Partial<Element>).animate
})

describe('CrossfadeImage：换图不闪、换得顺', () => {
  it('第一张也要解码完才上屏，然后从透明淡入', async () => {
    const { container } = render(<CrossfadeImage src="a.webp" alt="她" imgClassName="h-full" />)
    expect(imgs(container)).toEqual([]) // 没好之前什么都不放（不闪空框 / 半张图）
    await loaded('a.webp')
    expect(imgs(container)).toEqual(['a.webp'])
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('她')
    expect(container.querySelector('img')?.className).toBe('h-full')
    expect(anims.map((a) => a.frames)).toEqual([[{ opacity: 0 }, { opacity: 1 }]])
  })

  it('换图：新图没好之前一直是旧图；好了交叉淡化（旧的同时淡出），淡完撤掉旧图', async () => {
    const { container, rerender } = render(<CrossfadeImage src="a.webp" />)
    await loaded('a.webp')
    await finishAll()
    rerender(<CrossfadeImage src="b.webp" />)
    expect(imgs(container)).toEqual(['a.webp'])
    await loaded('b.webp')
    expect(imgs(container)).toEqual(['a.webp', 'b.webp']) // 叠在同一格里
    const [out, into] = anims
    expect(out.el.getAttribute('src')).toBe('a.webp')
    expect(out.frames).toEqual([{ opacity: 0 }]) // 从此刻的透明度淡出
    expect(into.el.getAttribute('src')).toBe('b.webp')
    expect(container.querySelectorAll('img')[0].getAttribute('aria-hidden')).toBe('true')
    await finishAll()
    expect(imgs(container)).toEqual(['b.webp'])
  })

  it('over：新图盖上去淡入，旧图不动（背景用）', async () => {
    const { rerender } = render(<CrossfadeImage src="a.webp" mode="over" />)
    await loaded('a.webp')
    await finishAll()
    rerender(<CrossfadeImage src="b.webp" mode="over" />)
    await loaded('b.webp')
    expect(anims.map((a) => a.el.getAttribute('src'))).toEqual(['b.webp'])
  })

  it('连着换：只显示最后要的那张，晚到的旧图不上屏', async () => {
    const { container, rerender } = render(<CrossfadeImage src="a.webp" />)
    await loaded('a.webp')
    await finishAll()
    rerender(<CrossfadeImage src="b.webp" />)
    rerender(<CrossfadeImage src="c.webp" />)
    await loaded('c.webp')
    await loaded('b.webp') // b 比 c 晚到
    await finishAll()
    expect(imgs(container)).toEqual(['c.webp'])
  })

  it('换走又马上换回来：不动', async () => {
    const { container, rerender } = render(<CrossfadeImage src="a.webp" />)
    await loaded('a.webp')
    await finishAll()
    rerender(<CrossfadeImage src="b.webp" />)
    rerender(<CrossfadeImage src="a.webp" />)
    await loaded('a.webp')
    expect(imgs(container)).toEqual(['a.webp'])
    expect(anims).toEqual([])
  })

  it('加载失败：保留原来那张，告诉调用方', async () => {
    const onError = vi.fn()
    const { container, rerender } = render(<CrossfadeImage src="a.webp" onError={onError} />)
    await loaded('a.webp')
    await finishAll()
    rerender(<CrossfadeImage src="bad.webp" onError={onError} />)
    await broken('bad.webp')
    expect(imgs(container)).toEqual(['a.webp'])
    expect(onError).toHaveBeenCalledWith('bad.webp')
  })

  it('src 为空：保留原来那张', async () => {
    const { container, rerender } = render(<CrossfadeImage src="a.webp" />)
    await loaded('a.webp')
    rerender(<CrossfadeImage src="" />)
    expect(imgs(container)).toEqual(['a.webp'])
  })

  it('没有动画能力 / 减少动态效果：直接换，不留旧图', async () => {
    delete (Element.prototype as Partial<Element>).animate
    const { container, rerender } = render(<CrossfadeImage src="a.webp" />)
    await loaded('a.webp')
    rerender(<CrossfadeImage src="b.webp" />)
    await loaded('b.webp')
    expect(imgs(container)).toEqual(['b.webp'])

    Element.prototype.animate = vi.fn() as unknown as Element['animate']
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    rerender(<CrossfadeImage src="c.webp" />)
    await loaded('c.webp')
    expect(imgs(container)).toEqual(['c.webp'])
    expect(Element.prototype.animate).not.toHaveBeenCalled()
  })

  it('外层是网格，每张图叠在同一格；外层样式照传', async () => {
    const { container } = render(<CrossfadeImage src="a.webp" className="absolute inset-0" style={{ zIndex: 1 }} />)
    await loaded('a.webp')
    const box = container.firstElementChild as HTMLElement
    expect(box.className).toBe('absolute inset-0')
    expect(box.style.display).toBe('grid')
    expect(box.style.zIndex).toBe('1')
    expect((container.querySelector('img') as HTMLElement).style.gridArea).toContain('1')
  })
})
