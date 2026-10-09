/**
 * @dianziji/stage-autoplay：舞台的自动播放（独立模块，只依赖 react，不依赖舞台 SDK、不碰平台）。
 *
 *   const ap = useAutoPlay({ text: 这一句, canAdvance: 还有下一句, onNext: 翻页, paused: 舞台自己要停的时候 })
 *   <AutoPlayButton state={ap} />      开关 + 倒计时环
 *   <AutoPlaySettings />               开关 + 每字停留 / 句末停顿 两条滑杆
 *   import '@dianziji/stage-autoplay/styles.css'   默认样式（CSS 变量换配色）
 *
 * 等多久＝句末停顿 + 字数 × 每字停留（空白标点不算字，最多 12 秒）；最后一句、AI 还没写出下一句时原地等，绝不替玩家选。
 */
export { countChars, DEFAULT_PREFS, delayFor, LIMITS, MAX_DELAY_MS, normalizePrefs, type AutoPlayPrefs } from './core'
export { autoPlayStore, createAutoPlayStore, STORAGE_KEY, type AutoPlayStore } from './store'
export { useAutoPlayPrefs } from './useAutoPlayPrefs'
export { useAutoPlay, type AutoPlayState, type UseAutoPlayOptions } from './useAutoPlay'
export { default as AutoPlayButton } from './AutoPlayButton'
export { default as AutoPlaySettings } from './AutoPlaySettings'
