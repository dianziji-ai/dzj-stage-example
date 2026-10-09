---
name: stage-settings
description: 舞台的播放设置（官方模块 @dianziji/stage-settings）：文本速度（逐字打出）、字号、动效、选项行为（填入确认 / 直接发送）、自动播放，一个面板全调、存玩家本机。作者要「设置面板 / 打字机效果 / 文字速度 / 字号调节 / 关动画 / 点选项先填入 / 自动播放 / 自动翻页」，或要改这些控件的样子时用。
---

# 播放设置

官方模块 `packages/stage-settings/`（`@dianziji/stage-settings`，只依赖 react）。**先读** `docs/settings.md` 和 `packages/stage-settings/README.md`。

## 规则

1. **打字、自动播放、设置读写一律用模块**（`useTypewriter` / `useAutoPlay` / `useSettings`），不要自己写 setInterval 打字、setTimeout 翻页、localStorage 存设置。模块已经测好的行为：打字中点一下先补完、生成中同一句变长接着打、字打完才计时、最后一句停住不替玩家选、等 AI 写出下一句、后台暂停、换句从头计时。
2. **所有 hook 放在对话框组件的提前 `return` 之前**；对话框藏起来用 `paused` 停，不要条件调用。
3. **点正文**：`tw.done ? 翻下一句 : tw.finish()`。**自动播放** `ready: tw.done`、`canAdvance: idx < last`、`onNext` 用和「下一句」同一个翻页函数。
4. **`paused` 写全**：不在游玩页（地图 / 图册时对话框常常只是藏起来没卸载，不算上就会在后台一直翻）、输入框 / 快捷指令 / 弹窗开着、回看旧的一轮（`useTurnCursor().viewing`）、对话框藏起来、错误提示开着。
5. **选项行为要尊重设置**：`settings.choiceMode === 'send'` 才直接发；默认 `fill` 用 `fillChoice` 填进输入框（换场 / 地图「前往」也一样）。发出去后把叠加记录清空。
6. **字号**：App 顶层 `useSettingsRoot()`，对话（和想跟着变的面板）字号写 `calc(Npx * var(--dzj-font-scale, 1))`。**动效**：模块的 styles.css 已经处理「减少」，舞台自己的动画照常写，别另做开关。
7. **界面舞台自己定**：默认按钮很低调；要别的样子就覆盖 CSS 变量 / 加 className / 只用 hook 自己画；舞台没有选项就 `<SettingsPanel sections={…}>` 去掉 `choice`。**绝不改 `packages/stage-settings/`**（只读，`npm test` 会拦）。
8. 设置存玩家本机，模块自己管；**不要把它们放进存档**。

## 接法（照抄例子）

- `src/index.css`：`@import '@dianziji/stage-settings/styles.css';`
- `src/App.tsx`：`useSettingsRoot()`
- `src/game/Dialogue.tsx`：`useTypewriter` / `useAutoPlay` / `useSettings` + `pick`；正文 `tw.shown`；字号 `calc(…)`
- `src/game/PlayControl.tsx`：`<AutoPlayButton state={auto} onSettings={…} />` + 浮层 `<SettingsPanel />`（点外面 / Esc 收起）
- `src/styles/surfaces.css` 末尾：`--dzj-ap-*` 换成卡的配色

## 自检

- 文本速度四档都试：标准逐字出、瞬间整句出；打字中点一下补完、再点翻页；
- 自动播放：字打完才开始倒计时；最后一句停住；切到地图 / 打开输入框不翻；
- 字号小 / 大：对话字号跟着变，手机上不溢出；动效「减少」：淡入、浮动停掉；
- 选项「填入确认」：点两个选项，输入框里按顺序两行；手改后再点从头叠；「直接发送」点了就发；
- 手机标题栏放得下，设置浮层不超出屏幕、内容多时能在浮层里滚动；刷新后设置还在。
