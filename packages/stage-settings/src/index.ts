/**
 * @dianziji/stage-settings：舞台的播放设置（独立模块，只依赖 react，不依赖舞台 SDK、不碰平台）。
 * 一份设置管六样：文本速度（逐字打出）· 字号 · 动效 · 选项行为 · 自动播放 · 配音（0.2.0）；存玩家本机，一个面板全调。
 *
 *   useSettingsRoot()                                   App 顶层调一次：字号 / 动效写到 <html> 上
 *   const tw = useTypewriter(这一句)                     逐字打出：tw.shown / tw.done / tw.finish()
 *   const auto = useAutoPlay({ text, canAdvance, onNext, ready: tw.done, paused })
 *   <AutoPlayButton state={auto} onSettings={打开面板} />  低调的「▶ 自动」+「调节」
 *   <SettingsPanel />                                   整个设置面板
 *   const [s] = useSettings(); s.choiceMode === 'fill' ? fillChoice(…) : 直接发
 *   import '@dianziji/stage-settings/styles.css'
 */
export {
  CHARS_PER_SEC,
  countChars,
  DEFAULT_SETTINGS,
  delayFor,
  fillChoice,
  FONT_SCALE,
  LIMITS,
  MAX_DELAY_MS,
  normalizeSettings,
  PACES,
  paceOf,
  sameSettings,
  type AutoPlay,
  type ChoiceMode,
  type FontSize,
  type Motion,
  type Pace,
  type Settings,
  type Sfx,
  type TextSpeed,
  type Voice,
  VOICE_MAX_LINE,
  VOICE_MAX_TURN,
} from './core'
export { createSettingsStore, settingsStore, STORAGE_KEY, type SettingsPatch, type SettingsStore } from './store'
export { useSettings } from './useSettings'
export { useSettingsRoot } from './useSettingsRoot'
export { useTypewriter, type Typewriter } from './useTypewriter'
export { useAutoPlay, type AutoPlayState, type UseAutoPlayOptions } from './useAutoPlay'
export { default as AutoPlayButton } from './AutoPlayButton'
export { default as SettingsPanel, type SettingsSection } from './SettingsPanel'
