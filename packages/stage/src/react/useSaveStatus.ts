import { useSyncExternalStore } from 'react'
import type { SaveStatus, Saver } from '..'

/** 存档器的状态（idle / saving / saved / error + 最近一次存好的时间） */
export function useSaveStatus(saver: Saver): SaveStatus {
  return useSyncExternalStore(saver.subscribe, () => saver.status)
}
