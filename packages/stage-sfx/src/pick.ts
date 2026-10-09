import type { SfxName } from './synth'

/**
 * 这个元素该响什么（纯 DOM 判断，好测）。
 *   ① 自己或祖先写了 data-sfx：照写的来（"none"＝不响；"confirm" / "cancel" / "open" / "page" / "error"…）；
 *   ② 开关（role=switch、复选框、aria-pressed 的按钮）：点了是打开还是关上 → on / off（读点之前的状态）；
 *   ③ 看起来能点（button、链接、role=button / radio / tab / option、label、或者鼠标放上去是小手 cursor:pointer）→ click；
 *   ④ 都不是：不响（null）。
 * 悬停（hover）只看 ①③：data-sfx="none" 或 data-sfx-hover="none" 不响，能点就响。
 */
const CLICKABLE = 'button, a[href], summary, label, select, [role="button"], [role="radio"], [role="tab"], [role="option"], [role="menuitem"], [role="switch"], [role="checkbox"], input[type="checkbox"], input[type="radio"]'
const NAMES = new Set<SfxName>(['hover', 'click', 'confirm', 'cancel', 'open', 'on', 'off', 'page', 'error'])

/** 往上找最近一个「能点」的元素（最多 6 层） */
export function clickableOf(el: Element | null): Element | null {
  for (let n = el, i = 0; n && i < 6; n = n.parentElement, i++) {
    if ((n as HTMLButtonElement).disabled || n.getAttribute('aria-disabled') === 'true') return null
    if (n.hasAttribute('data-sfx') || n.matches(CLICKABLE)) return n
    if (typeof getComputedStyle === 'function' && getComputedStyle(n).cursor === 'pointer') return n
  }
  return null
}

export function soundForClick(el: Element | null): SfxName | null {
  const c = clickableOf(el)
  if (!c) return null
  const tag = c.getAttribute('data-sfx')
  if (tag === 'none') return null
  if (tag && NAMES.has(tag as SfxName)) return tag as SfxName
  const sw = c.matches('[role="switch"], [role="checkbox"], input[type="checkbox"]') ? c : c.querySelector('input[type="checkbox"], [role="switch"]')
  if (sw && (sw === c || c.tagName === 'LABEL')) {
    const checked = (sw as HTMLInputElement).checked ?? sw.getAttribute('aria-checked') === 'true'
    return checked ? 'off' : 'on'
  }
  const pressed = c.getAttribute('aria-pressed')
  if (pressed === 'true') return 'off'
  if (pressed === 'false') return 'on'
  return 'click'
}

export function soundForHover(el: Element | null): Element | null {
  const c = clickableOf(el)
  if (!c || c.getAttribute('data-sfx') === 'none' || c.getAttribute('data-sfx-hover') === 'none') return null
  return c
}
