import { useSyncExternalStore } from 'react'
import type { Settings } from './core'
import { settingsStore, type SettingsStore } from './store'

/** 读设置（store 一变就重画）。返回 [设置, 改设置] */
export function useSettings(store: SettingsStore = settingsStore): [Settings, SettingsStore['set']] {
  const s = useSyncExternalStore(store.subscribe, store.get, store.get)
  return [s, store.set]
}
