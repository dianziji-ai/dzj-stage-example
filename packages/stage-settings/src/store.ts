/**
 * 设置存哪：玩家本机（localStorage），每张卡各记各的（舞台在平台上线时本机存储自动按卡分开）。不进存档。
 * 一个 store 被好几个地方读（设置面板、自动播放按钮、打字机、对话框），改一处其它都跟着变：subscribe / get 给 useSyncExternalStore 用。
 * ★读写都包 try：隐私模式 / 禁用站点数据时照常能用，只是记不住。
 */
import { normalizeSettings, sameSettings, type AutoPlay, type Settings, type Sfx, type Voice } from './core'

export const STORAGE_KEY = 'dzj-stage-settings'

/** 改设置：autoPlay / voice / sfx 可以只给要改的那几项 */
export type SettingsPatch = Partial<Omit<Settings, 'autoPlay' | 'voice' | 'sfx'>> & { autoPlay?: Partial<AutoPlay>; voice?: Partial<Voice>; sfx?: Partial<Sfx> }

export type SettingsStore = {
  get: () => Settings
  set: (patch: SettingsPatch) => void
  subscribe: (fn: () => void) => () => void
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>

/** 建一个 store（测试传假的 storage；正常用默认的 settingsStore） */
export function createSettingsStore(storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null, key = STORAGE_KEY): SettingsStore {
  let settings = read()
  const subs = new Set<() => void>()

  function read(): Settings {
    try {
      return normalizeSettings(JSON.parse(storage?.getItem(key) ?? 'null'))
    } catch {
      return normalizeSettings(null)
    }
  }

  return {
    get: () => settings,
    set(patch) {
      const next = normalizeSettings({ ...settings, ...patch, autoPlay: { ...settings.autoPlay, ...patch.autoPlay }, voice: { ...settings.voice, ...patch.voice }, sfx: { ...settings.sfx, ...patch.sfx } })
      if (sameSettings(next, settings)) return
      settings = next
      try {
        storage?.setItem(key, JSON.stringify(settings))
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

/** 默认的那一个（各个组件、hook 不传 store 时都用它） */
export const settingsStore = createSettingsStore()
