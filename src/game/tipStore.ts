/** 提示弹窗的数据（showTip / hideTip）；显示由 Tip.tsx 的 <TipHost /> 负责 */
export type Tip = {
  /** 圆章里的图标（emoji） */
  icon?: string
  /** 圆章里放一张图（比如立绘：取上半身），有它就不用 icon */
  image?: string
  title: string
  text?: string
  /** 主按钮（不给就只有「知道啦」） */
  action?: { label: string; onClick: () => void }
  /** 几行说明（图标 + 名字 + 当前值 + 一句话），做「状态说明」这类用 */
  rows?: { icon: string; label: string; value?: string; desc: string }[]
  /** 按钮上面一行小字提醒（比如「会消耗能量」） */
  note?: string
  /** 关闭按钮文字 */
  dismiss?: string
}

let cur: Tip | null = null
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

export function showTip(t: Tip) {
  cur = t
  emit()
}
export function hideTip() {
  cur = null
  emit()
}


export const tipStore = {
  subscribe(f: () => void) {
    subs.add(f)
    return () => {
      subs.delete(f)
    }
  },
  get: () => cur,
}
