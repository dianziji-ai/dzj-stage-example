import { useEffect } from 'react'
import { settingsStore, type SettingsStore } from '@dianziji/stage-settings'
import { setStore, sfx } from './engine'
import { soundForClick, soundForHover } from './pick'

/**
 * App 顶层调一次：整个舞台里看起来能点的东西都自动有声——鼠标划进去「嘀」、点了按类型响（点击 / 开关 / data-sfx 写的）。
 *   ★手机没有悬停：只认鼠标（pointerType === 'mouse'）；同一个元素划进去只响一次，划过一排有限流。
 *   ★在捕获阶段听：舞台自己的 onClick 里 stopPropagation 也拦不住音效；点之前读开关状态，开 / 关不会响反。
 */
export function useSfxRoot(opts: { store?: SettingsStore } = {}) {
  useEffect(() => {
    setStore(opts.store ?? settingsStore)
    let hovered: Element | null = null
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const c = soundForHover(e.target as Element)
      if (c && c !== hovered) sfx('hover')
      hovered = c
    }
    const click = (e: MouseEvent) => {
      const name = soundForClick(e.target as Element)
      if (name) sfx(name)
    }
    document.addEventListener('pointerover', over, true)
    document.addEventListener('click', click, true)
    return () => {
      document.removeEventListener('pointerover', over, true)
      document.removeEventListener('click', click, true)
    }
  }, [opts.store])
}
