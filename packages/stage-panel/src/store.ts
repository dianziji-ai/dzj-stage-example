import { useSyncExternalStore } from 'react'

/** 面板开没开：一个全局小开关，游戏自己的菜单 / 快捷键也能开关它（不用把状态往下传） */
let open = false
const subs = new Set<() => void>()
const set = (v: boolean) => {
  if (open === v) return
  open = v
  subs.forEach((f) => f())
}

export const openStagePanel = () => set(true)
export const closeStagePanel = () => set(false)
export const toggleStagePanel = () => set(!open)

export function useStagePanelOpen(): boolean {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => open,
  )
}
