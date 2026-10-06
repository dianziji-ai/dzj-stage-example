/**
 * 视口：把「安全区」和「键盘遮挡」统一成 5 个 CSS 变量，写在 <html> 上，舞台 CSS 直接用：
 *
 *   --safe-top / --safe-right / --safe-bottom / --safe-left   刘海、home indicator 等（px）
 *   --kb                                                       软键盘挡住了底部多少（px，没弹＝0）
 *
 * 两种环境：
 *  ① 本地开发（舞台就是顶层页面）：安全区 CSS 里默认就是 env(safe-area-inset-*)；键盘用 visualViewport 算。
 *  ② 线上（舞台在平台 iframe 里）：iframe 里 env() 恒为 0、也算不出键盘——由平台量好推进来：
 *       { type: 'stage:viewport', safe: { top, right, bottom, left } }
 *       { type: 'stage:kb', px }
 *     收到就覆盖上面的变量。只认父窗口发来的消息。
 *
 * ★让位的是内容不是容器：背景铺满到屏幕边，只把按钮/输入框用 padding 顶开。
 */
export function watchViewport(): () => void {
  const root = document.documentElement
  const set = (k: string, px: number) => root.style.setProperty(k, `${Math.max(0, Math.round(px))}px`)
  const inFrame = window.parent !== window
  const offs: (() => void)[] = []

  if (inFrame) {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window.parent || !e.data || typeof e.data !== 'object') return
      const d = e.data as { type?: string; safe?: Record<string, number>; px?: number }
      if (d.type === 'stage:viewport' && d.safe) {
        for (const edge of ['top', 'right', 'bottom', 'left']) set(`--safe-${edge}`, Number(d.safe[edge]) || 0)
      } else if (d.type === 'stage:kb') {
        set('--kb', Number(d.px) || 0)
      }
    }
    window.addEventListener('message', onMsg)
    offs.push(() => window.removeEventListener('message', onMsg))
  } else if (window.visualViewport) {
    // 键盘只在有输入框聚焦时才会出现：没聚焦＝0，并把基线重置成当前窗口高度
    // （否则电脑上把窗口拖小，高度差会被当成键盘，底部垫出一大块空白）。
    // 聚焦时基线取「聚焦前的高度」：有的设备键盘一弹 innerHeight 也跟着变小，拿当前值当基线会恒等于 0。
    const vv = window.visualViewport
    const touch = window.matchMedia('(pointer: coarse)').matches // 电脑没有软键盘，恒 0
    let base = window.innerHeight
    const update = () => {
      if (!touch || !isEditing()) {
        base = window.innerHeight
        set('--kb', 0)
        return
      }
      set('--kb', Math.max(base, window.innerHeight) - vv.height - vv.offsetTop)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    offs.push(() => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
    })
  }

  return () => offs.forEach((f) => f())
}

/** 现在是不是在打字（键盘可能弹着）：焦点在输入框 / 文本框 / 可编辑区域上 */
function isEditing(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true
  return el.tagName === 'INPUT' && !['button', 'checkbox', 'radio', 'submit', 'range', 'file'].includes((el as HTMLInputElement).type)
}
