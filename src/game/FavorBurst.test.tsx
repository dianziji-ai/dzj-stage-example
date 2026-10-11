// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import FavorBurst from './FavorBurst'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// jsdom 没有 Web Animations：进度条那一下动画给个空实现
Element.prototype.animate ??= (() => ({}) as Animation) as never

function render(el: React.ReactElement): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  act(() => createRoot(host).render(el))
  return host
}

describe('好感演出', () => {
  it('涨：「好感 +3」+ 当前值和阶段名 + 原因', () => {
    const h = render(<FavorBurst tick={{ delta: 3, reason: '第一次被认真欢迎', n: 1 }} favor={23} />)
    expect(h.textContent).toContain('+3')
    expect(h.textContent).toContain('23 · 熟悉的同居人')
    expect(h.textContent).toContain('第一次被认真欢迎')
  })
  it('降：带负号；跨过阶段线显示新阶段', () => {
    const h = render(<FavorBurst tick={{ delta: -4, reason: '', n: 2 }} favor={18} />)
    expect(h.textContent).toContain('-4')
    expect(h.textContent).toContain('好奇的新室友')
  })
  it('没变：什么都不出', () => {
    expect(render(<FavorBurst tick={{ delta: 0, reason: '', n: 3 }} favor={22} />).innerHTML).toBe('')
  })
})
