/**
 * @dianziji/stage-panel —— 每个舞台都带的「本局」面板。
 *
 *   import { StagePanel, openStagePanel } from '@dianziji/stage-panel'
 *   <StagePanel stage={stage} />
 *
 * 样式：主样式里 @import '@dianziji/stage-panel/styles.css'（Tailwind），换肤覆盖 --color-sp-* 变量。
 * 教程（用法、参数、全部配色变量、深色）：docs/panel.md
 * ★只读：作者开发时不要改这个包（官方升级时整个替换）。文档：docs/panel.md
 */
export { default as StagePanel } from './StagePanel'
export { closeStagePanel, openStagePanel, toggleStagePanel, useStagePanelOpen } from './store'
