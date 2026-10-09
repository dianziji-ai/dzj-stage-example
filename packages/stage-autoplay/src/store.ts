/**
 * 设置存哪：玩家本机（localStorage），每张卡各记各的（舞台在平台上线时本机存储自动按卡分开）。
 * 一个 store 被好几个组件读（按钮、设置面板、计时钩子），改一处其它都跟着变：subscribe / getSnapshot 给 useSyncExternalStore 用。
 * ★读写都包 try：隐私模式 / 禁用站点数据时照常能用，只是记不住。
 */
import { normalizePrefs, type AutoPlayPrefs } from './core'

export const STORAGE_KEY = 'dzj-stage-autoplay'

export type AutoPlayStore = {
  get: () => AutoPlayPrefs
  set: (patch: Partial<AutoPlayPrefs>) => void
  subscribe: (fn: () => void) => () => void
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>

/** 建一个 store（测试传假的 storage；正常用默认的 autoPlayStore） */
export function createAutoPlayStore(storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null, key = STORAGE_KEY): AutoPlayStore {
  let prefs = read()
  const subs = new Set<() => void>()

  function read(): AutoPlayPrefs {
    try {
      return normalizePrefs(JSON.parse(storage?.getItem(key) ?? 'null'))
    } catch {
      return normalizePrefs(null)
    }
  }

  return {
    get: () => prefs,
    set(patch) {
      const next = normalizePrefs({ ...prefs, ...patch })
      if (next.on === prefs.on && next.perChar === prefs.perChar && next.pause === prefs.pause) return
      prefs = next
      try {
        storage?.setItem(key, JSON.stringify(prefs))
      } catch {
        /* 写不进就只在这一次打开里生效 */
      }
      subs.forEach((f) => f())
    },
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
  }
}

/** 默认的那一个（按钮、设置面板、计时钩子不传 store 时都用它） */
export const autoPlayStore = createAutoPlayStore()
