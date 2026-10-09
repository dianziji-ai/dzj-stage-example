// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { isBlankClick } from './gestures'

const dom = (html: string) => {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

describe('isBlankClick：点在空白上才翻页', () => {
  const root = dom('<div id="bg"></div><p id="text">旁白</p><button id="b"><span id="in">下一轮</span></button><input id="i"/><div role="dialog"><p id="d">面板</p></div><div data-no-advance><p id="na">x</p></div>')
  const $ = (id: string) => root.querySelector('#' + id)
  it('背景、普通文字＝空白', () => {
    expect(isBlankClick($('bg'), root)).toBe(true)
    expect(isBlankClick($('text'), root)).toBe(true)
  })
  it('按钮（包括按钮里面的字）、输入框、弹窗、标了 data-no-advance 的＝不算', () => {
    expect(isBlankClick($('b'), root)).toBe(false)
    expect(isBlankClick($('in'), root)).toBe(false)
    expect(isBlankClick($('i'), root)).toBe(false)
    expect(isBlankClick($('d'), root)).toBe(false)
    expect(isBlankClick($('na'), root)).toBe(false)
  })
  it('不在游玩页里的（挂在 body 上的面板）、不是元素的＝不算', () => {
    const outside = document.createElement('p')
    document.body.appendChild(outside)
    expect(isBlankClick(outside, root)).toBe(false)
    expect(isBlankClick(null, root)).toBe(false)
  })
})
