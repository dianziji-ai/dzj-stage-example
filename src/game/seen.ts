import { local } from '@dianziji/stage'

/** 本机记一笔「看过了」（SDK 的 local：按卡分开、隐私模式下记不住就下次再弹一次，不影响玩）。开场 CG、开场视频共用 */
export function seen(key: string): boolean {
  return local.get(key) === '1'
}

export function markSeen(key: string) {
  local.set(key, '1')
}
