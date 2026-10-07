import { useEffect, useSyncExternalStore } from 'react'
import { bgm } from './bgm'
import type { SongId } from './songs'

/** 这首曲子该放就放（换曲由播放器淡入淡出） */
export function useBgm(song: SongId) {
  useEffect(() => {
    void bgm.play(song)
  }, [song])
}

/** 🎵 按钮用：当前开关 / 音量（播放器变了自动刷新） */
export function useBgmPrefs() {
  return useSyncExternalStore(
    (fn) => bgm.subscribe(fn),
    () => bgm.prefs,
  )
}
