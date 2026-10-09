import { describe, expect, it } from 'vitest'
import { soundForClick, soundForHover } from '../src/pick'

const html = (s: string) => {
  document.body.innerHTML = s
  return (sel: string) => document.querySelector(sel)!
}

describe('soundForClick：点了响什么', () => {
  it('按钮 / 链接 / role=button → click；里面的图标点到也算', () => {
    const $ = html('<button id="b"><svg><path id="p"/></svg></button><a id="a" href="#">x</a><div id="r" role="button">x</div>')
    expect(soundForClick($('#p'))).toBe('click')
    expect(soundForClick($('#a'))).toBe('click')
    expect(soundForClick($('#r'))).toBe('click')
  })
  it('看起来能点（cursor:pointer 的 div，比如选项条、自由发言气泡）→ click；普通文字 → 不响', () => {
    const $ = html('<div id="row" style="cursor:pointer"><span id="t">暂时没有动作</span></div><p id="plain">旁白</p>')
    expect(soundForClick($('#t'))).toBe('click')
    expect(soundForClick($('#plain'))).toBeNull()
  })
  it('data-sfx 写了就照写的来；none 不响；禁用的不响', () => {
    const $ = html('<button id="c" data-sfx="confirm"><b id="in">选</b></button><button id="n" data-sfx="none">x</button><button id="d" disabled>x</button>')
    expect(soundForClick($('#in'))).toBe('confirm')
    expect(soundForClick($('#n'))).toBeNull()
    expect(soundForClick($('#d'))).toBeNull()
  })
  it('开关：读点之前的状态——关着点＝on，开着点＝off（复选框、role=switch、aria-pressed、包着开关的 label）', () => {
    const $ = html('<input id="cb" type="checkbox"><button id="pr" aria-pressed="true">自动</button><label id="lb"><span id="lt">配音</span><input type="checkbox" role="switch" checked></label>')
    expect(soundForClick($('#cb'))).toBe('on')
    expect(soundForClick($('#pr'))).toBe('off')
    expect(soundForClick($('#lt'))).toBe('off')
  })
})

describe('soundForHover：悬停', () => {
  it('能点的才响；data-sfx-hover="none" 不响', () => {
    const $ = html('<button id="b">x</button><button id="q" data-sfx-hover="none">x</button><p id="p">字</p>')
    expect(soundForHover($('#b'))).toBe($('#b'))
    expect(soundForHover($('#q'))).toBeNull()
    expect(soundForHover($('#p'))).toBeNull()
  })
})
