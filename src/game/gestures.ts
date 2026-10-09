import { useCallback, useState, type MouseEvent } from 'react'

/**
 * 游玩页的鼠标手势（galgame 习惯）：
 *  · 右键：把画面上的界面全部藏起来（只剩背景和立绘，方便看图）；再右键一次全部回来。藏着时左键点一下也回来（别让玩家找不到界面）。
 *  · 左键点空白处：和点正文一样翻下一句（打字中先补完）——点背景、立绘、对话框里没按钮的地方都算。
 * 不算「空白」的：按钮、链接、输入框这些能点的东西；弹出来的面板（本局面板、快捷指令、输入层这些挂在 body 上的，DOM 不在游玩页里）。
 */

/** 能点 / 能输入的东西：点它们不翻页 */
const INTERACTIVE = 'button,a,input,textarea,select,label,summary,[role="button"],[role="dialog"],[contenteditable="true"],[data-no-advance]'

/** 这一下是点在「空白」上吗（在游玩页里、又不是能点的东西） */
export function isBlankClick(target: EventTarget | null, root: Element): boolean {
  if (!(target instanceof Element) || !root.contains(target)) return false
  return !target.closest(INTERACTIVE)
}

/**
 * enabled＝此刻在游玩页、没开菜单 / 弹窗；advance＝翻下一句（对话框的 next）。
 * 返回 bare（界面藏着）和要挂在游玩页最外层的两个事件。
 */
export function usePlayGestures({ enabled, advance }: { enabled: boolean; advance: () => void }) {
  const [bare, setBare] = useState(false)
  const shown = bare && enabled
  const onContextMenu = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return
      e.preventDefault()
      setBare((b) => !b)
    },
    [enabled],
  )
  const onClick = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return
      if (bare) return setBare(false)
      if (isBlankClick(e.target, e.currentTarget)) advance()
    },
    [enabled, bare, advance],
  )
  return { bare: shown, onClick, onContextMenu }
}
