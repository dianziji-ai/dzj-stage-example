/**
 * 顶部提示（toast）：toast('存档已更新') / toast('没存上', 'error')。由 <StageToaster /> 显示。
 * 同时最多 3 条（新的顶掉最旧的）；普通 2.5 秒、出错 4 秒后自己消失。
 */
export type ToastKind = 'ok' | 'info' | 'error'
export type Toast = { id: number; text: string; kind: ToastKind }

let list: Toast[] = []
let seq = 0
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

export function toast(text: string, kind: ToastKind = 'info') {
  // 同一句话连着来（比如连续断网）只留一条
  if (list.some((t) => t.text === text)) return
  const id = ++seq
  list = [...list.slice(-2), { id, text, kind }]
  emit()
  setTimeout(() => dismissToast(id), kind === 'error' ? 4000 : 2500)
}

export function dismissToast(id: number) {
  if (!list.some((t) => t.id === id)) return
  list = list.filter((t) => t.id !== id)
  emit()
}

export const toastStore = {
  subscribe(fn: () => void) {
    subs.add(fn)
    return () => {
      subs.delete(fn)
    }
  },
  get: () => list,
}
