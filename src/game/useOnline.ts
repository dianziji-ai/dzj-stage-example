import { useSyncExternalStore } from 'react'

/** 现在有没有网（浏览器 online / offline 事件；断网时给个提醒） */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (fn) => {
      window.addEventListener('online', fn)
      window.addEventListener('offline', fn)
      return () => {
        window.removeEventListener('online', fn)
        window.removeEventListener('offline', fn)
      }
    },
    () => navigator.onLine,
  )
}
