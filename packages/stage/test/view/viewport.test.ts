// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { watchViewport } from '../../src/view/viewport'

const css = (k: string) => document.documentElement.style.getPropertyValue(k)
let off: (() => void) | undefined

beforeEach(() => document.documentElement.removeAttribute('style'))
afterEach(() => {
  off?.()
  off = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('线上：在平台 iframe 里，由平台推安全区', () => {
  const parent = { postMessage: vi.fn() } as unknown as Window & { postMessage: ReturnType<typeof vi.fn> }
  beforeEach(() => {
    parent.postMessage.mockClear()
    vi.spyOn(window, 'parent', 'get').mockReturnValue(parent)
  })
  // jsdom 的 MessageEvent 不接受假 source：直接给事件对象补上
  const send = (data: unknown, source: unknown = parent) => {
    const e = new MessageEvent('message', { data })
    Object.defineProperty(e, 'source', { value: source })
    window.dispatchEvent(e)
  }
  const safe = () => [css('--safe-top'), css('--safe-right'), css('--safe-bottom'), css('--safe-left')]

  it('开始接收时先给平台发 stage:hello（平台收到再推一次，不怕错过加载时那次）', () => {
    off = watchViewport()
    expect(parent.postMessage).toHaveBeenCalledWith({ type: 'stage:hello' }, '*')
  })

  it('stage:viewport 写四边安全区（取整、负数当 0、缺的当 0）', () => {
    off = watchViewport()
    send({ type: 'stage:viewport', safe: { top: 47.4, bottom: 34, left: -3 } })
    expect(safe()).toEqual(['47px', '0px', '34px', '0px'])
  })

  it('只认父窗口：别的窗口发来的、格式不对的、不认识的类型都不理（键盘不推，stage:kb 也不认）', () => {
    off = watchViewport()
    send({ type: 'stage:viewport', safe: { top: 50 } }, {})
    send('stage:viewport')
    send(null)
    send({ type: 'stage:kb', px: 300 })
    expect(safe()).toEqual(['', '', '', ''])
    expect(css('--kb')).toBe('')
  })

  it('停止监听后不再改', () => {
    off = watchViewport()
    off()
    send({ type: 'stage:viewport', safe: { top: 50 } })
    expect(css('--safe-top')).toBe('')
  })
})

describe('本地开发：顶层页面，用 visualViewport 算键盘', () => {
  function fakeViewport(touch: boolean) {
    const vv = Object.assign(new EventTarget(), { height: 800, offsetTop: 0 })
    vi.stubGlobal('visualViewport', vv)
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)' && touch }))
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
    return vv
  }

  it('手机：聚焦输入框、键盘弹出 → --kb＝挡住的高度；失焦归 0', () => {
    const vv = fakeViewport(true)
    off = watchViewport()
    expect(css('--kb')).toBe('0px')
    const input = document.body.appendChild(document.createElement('input'))
    input.focus()
    vv.height = 500
    vv.dispatchEvent(new Event('resize'))
    expect(css('--kb')).toBe('300px')
    input.blur()
    expect(css('--kb')).toBe('0px')
    input.remove()
  })

  it('按钮、复选框聚焦不算打字；文本框、可编辑区算', () => {
    const vv = fakeViewport(true)
    off = watchViewport()
    vv.height = 500
    const btn = Object.assign(document.createElement('input'), { type: 'checkbox' })
    document.body.appendChild(btn).focus()
    expect(css('--kb')).toBe('0px')
    const ta = document.body.appendChild(document.createElement('textarea'))
    ta.focus()
    expect(css('--kb')).toBe('300px')
    btn.remove()
    ta.remove()
  })

  it('电脑（没有软键盘）：拖小窗口也恒 0，不会在底部垫出空白', () => {
    const vv = fakeViewport(false)
    off = watchViewport()
    const input = document.body.appendChild(document.createElement('input'))
    input.focus()
    vv.height = 400
    vv.dispatchEvent(new Event('resize'))
    expect(css('--kb')).toBe('0px')
    input.remove()
  })

  it('停止监听后不再改', () => {
    const vv = fakeViewport(true)
    off = watchViewport()
    off()
    const input = document.body.appendChild(document.createElement('input'))
    input.focus()
    vv.height = 500
    vv.dispatchEvent(new Event('resize'))
    expect(css('--kb')).toBe('0px')
    input.remove()
  })
})
