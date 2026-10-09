/**
 * @dianziji/stage-sfx：舞台的界面音效（WebAudio 现场合成，零素材；设置在 @dianziji/stage-settings ≥0.2.0 的 sfx）。
 *
 *   useSfxRoot()                          App 顶层调一次：看起来能点的东西都自动有声（悬停「嘀」+ 点击「嗒」，开关自动开 / 关声）
 *   <button data-sfx="confirm">           要特别的声音就写 data-sfx：confirm / cancel / open / page / error / on / off / none
 *   sfx('confirm')                        不是点出来的（发送成功、出错）在代码里放
 *   duck(voice.playing)                   配音在念的时候把音效压低一半
 *   <SettingsPanel sections={[…, 'sfx']} />  设置面板里的「音效」一节（开关 + 音量）
 */
export { duck, sfx } from './engine'
export { clickableOf, soundForClick, soundForHover } from './pick'
export { type SfxName } from './synth'
export { useSfxRoot } from './useSfxRoot'
