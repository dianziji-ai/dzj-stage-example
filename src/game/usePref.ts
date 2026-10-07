import { useCallback, useState } from 'react'

/** 记在本机的小偏好（展开 / 收起之类）。读写都包 try：隐私模式下 localStorage 会抛。 */
export function usePref<T extends string>(key: string, initial: T, allowed: readonly T[]): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key) as T | null
      return s && allowed.includes(s) ? s : initial
    } catch {
      return initial
    }
  })
  const set = useCallback(
    (next: T) => {
      setV(next)
      try {
        localStorage.setItem(key, next)
      } catch {
        /* 存不了就只在这次生效 */
      }
    },
    [key],
  )
  return [v, set]
}
