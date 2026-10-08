/**
 * 安全区：刘海、home 条要让开的距离，写成 <html> 上的 4 个 CSS 变量，舞台 CSS 直接用（pt-safe 这些工具类）：
 *
 *   --safe-top / --safe-right / --safe-bottom / --safe-left   （px）
 *
 * 舞台在网站的 iframe 里，浏览器只把 env(safe-area-inset-*) 告诉最外层页面、iframe 里恒为 0——
 * 所以由网站量好放进快照（snapshot.safe_area），这里写成变量。StageBoot 自动调（启动时 + 每次变化），作者不用管；
 * 不用 React 的舞台：stage.subscribe((s) => applySafeArea(s.safe_area))。
 * 键盘不用管：手机上一律走全屏输入层（规定），舞台里没有会被键盘挡住的输入框。
 *
 * ★让位的是内容不是容器：背景铺满到屏幕边，只把按钮 / 输入框用 padding 顶开。
 */
export function applySafeArea(area: { top: number; right: number; bottom: number; left: number } | null | undefined): void {
  if (!area || typeof document === 'undefined') return
  const root = document.documentElement
  for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
    root.style.setProperty(`--safe-${edge}`, `${Math.max(0, Math.round(Number(area[edge]) || 0))}px`)
  }
}
