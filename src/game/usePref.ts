import { useCallback, useState } from 'react'
import { local } from '@dianziji/stage'

/** 记在本机的小偏好（展开 / 收起之类）。SDK 的 local：按卡分开（别的舞台同名的键不会互相覆盖）、隐私模式下只在这次生效 */
export function usePref<T extends string>(key: string, initial: T, allowed: readonly T[]): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    const s = local.get(key) as T | null
    return s && allowed.includes(s) ? s : initial
  })
  const set = useCallback(
    (next: T) => {
      setV(next)
      local.set(key, next)
    },
    [key],
  )
  return [v, set]
}
