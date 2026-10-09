import { useEffect } from 'react'
import { FONT_SCALE } from './core'
import { settingsStore, type SettingsStore } from './store'
import { useSettings } from './useSettings'

/**
 * 把「字号」「动效」两项写到页面根节点（<html>）上，舞台的样式据此调整——在 App 顶层调一次。
 *   --dzj-font-scale：0.88 / 1 / 1.2，对话字号写成 calc(17px * var(--dzj-font-scale, 1))；
 *   data-dzj-font="small|normal|large"、data-dzj-motion="full|reduced"：想按档位单独写样式时用；
 *   动效「减少」时 styles.css 会像系统「减少动态效果」那样把动画 / 过渡压到几乎为零。
 */
export function useSettingsRoot(store: SettingsStore = settingsStore, root: HTMLElement | null = typeof document !== 'undefined' ? document.documentElement : null): void {
  const [s] = useSettings(store)
  useEffect(() => {
    if (!root) return
    root.style.setProperty('--dzj-font-scale', String(FONT_SCALE[s.fontSize]))
    root.setAttribute('data-dzj-font', s.fontSize)
    root.setAttribute('data-dzj-motion', s.motion)
  }, [root, s.fontSize, s.motion])
}
