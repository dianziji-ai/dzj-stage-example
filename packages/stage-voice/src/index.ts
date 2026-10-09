/**
 * @dianziji/stage-voice：舞台的角色配音（依赖 @dianziji/stage ≥0.4.0 的 stage.speak、@dianziji/stage-settings ≥0.2.0 的配音设置）。
 *
 *   const voice = useVoice({ stage, turn, lines, index, streaming, paused })
 *   const auto = useAutoPlay({ text: voice.voiced ? '' : 这一句, ready: tw.done && !voice.busy, … })
 *   <VoiceButton voice={voice} />                   标题栏的配音开关
 *   <SettingsPanel sections={[…, 'voice']} />       设置面板里的「配音」一节（音量 / 一句上限 / 一轮上限）
 *   import '@dianziji/stage-voice/styles.css'
 */
export { cleanLine, planLines, voiceOf, type PlanOptions, type PlannedLine, type SkipReason, type VoiceLine } from './plan'
export { useVoice, type UseVoiceOptions, type Voice, type VoiceState } from './useVoice'
export { default as VoiceButton } from './VoiceButton'
