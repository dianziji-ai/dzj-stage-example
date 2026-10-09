import { useSyncExternalStore } from 'react'
import type { AutoPlayPrefs } from './core'
import { autoPlayStore, type AutoPlayStore } from './store'

/** 读设置（store 一变就重画）。返回 [设置, 改设置] */
export function useAutoPlayPrefs(store: AutoPlayStore = autoPlayStore): [AutoPlayPrefs, AutoPlayStore['set']] {
  const prefs = useSyncExternalStore(store.subscribe, store.get, store.get)
  return [prefs, store.set]
}
