/** 本机记一笔「看过了」（隐私模式下 localStorage 会抛：记不住就下次再弹一次，不影响玩）。开场 CG、开场视频共用 */
export function seen(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function markSeen(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* 记不住就算了 */
  }
}
