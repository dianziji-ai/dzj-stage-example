import { useEffect, type RefObject } from 'react'

/** 顶栏收起 / 展开前 Hud 发这个事件：先记下徽章此刻的位置 */
export const HUD_FOLD_EVENT = 'gal:hud-fold'

/**
 * 顶栏收起 / 展开时，手机右侧那一列入口（抓娃娃 / 检定 / 日志）在竖列和顶部横排之间丝滑滑过去（FLIP）：
 *   切换前（Hud 发 HUD_FOLD_EVENT）记下每个子元素的位置 → <html data-hud-folded> 一变就量新位置 →
 *   每个子元素从旧位置 translate 回新位置，依次错开 25ms。只动 transform（不重排）；「减少动态效果」时直接切过去。
 * 容器要是整体缩放了：屏幕上的位移要除回缩放比，才是子元素自己坐标里的位移（下面按实际宽度算，不缩放＝1）。
 */
export function useFoldFlip(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    // ★每次现取元素：对话框隐藏再显示时这一列是新建的，不能只在挂载那一刻抓一次
    let first: DOMRect[] | null = null
    const reduced = () =>
      document.documentElement.dataset.dzjMotion === 'reduced' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
    const remember = () => {
      const el = ref.current
      first = el ? Array.from(el.children, (c) => c.getBoundingClientRect()) : null
    }
    const mo = new MutationObserver(() => {
      const from = first
      first = null
      const el = ref.current
      if (!from || !el || reduced()) return
      const scale = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1
      Array.from(el.children).forEach((child, i) => {
        const a = from[i]
        if (!a || !(child instanceof HTMLElement) || typeof child.animate !== 'function') return
        const b = child.getBoundingClientRect()
        const dx = (a.left - b.left) / scale
        const dy = (a.top - b.top) / scale
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
        child.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
          duration: 460,
          delay: i * 25,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          fill: 'backwards',
        })
      })
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-hud-folded'] })
    window.addEventListener(HUD_FOLD_EVENT, remember)
    return () => {
      mo.disconnect()
      window.removeEventListener(HUD_FOLD_EVENT, remember)
    }
  }, [ref])
}
