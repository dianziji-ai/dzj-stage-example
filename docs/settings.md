# 播放设置（文本速度 · 字号 · 动效 · 选项行为 · 自动播放）

官方模块 `@dianziji/stage-settings`（在 `packages/stage-settings/`，只依赖 react），完整说明见它的 [README](../packages/stage-settings/README.md)。玩家在对话框标题栏点「调节」打开一个面板，五项全在里面；设置存本机，不进存档。

## 规则（模块定死，所有舞台一样）

- **文本速度**：慢 / 标准 / 快 / 瞬间（每秒 14 / 30 / 70 字）。打字中点一下先补完这句，再点才翻页。
- **字号**：小 / 标准 / 大，舞台的对话字号乘 `--dzj-font-scale`。
- **动效**：「减少」和系统「减少动态效果」一样。
- **选项行为**：默认「填入确认」——点选项填进输入框、确认后再发，连点几个按顺序叠加；也可以改成「直接发送」。
  舞台也可以不给玩家选：官方例子点选项一律直接发，第一次弹确认框（带「以后不再提示」，勾了记在本机），设置面板里去掉这一项（`sections` 不放 `choice`）。
- **自动播放**：字打完后等「句末停顿 + 字数 × 每字停留」（最多 12 秒）再翻；最后一句、AI 还没写出下一句、舞台暂停、页面在后台时不翻。

## 接进你的舞台

1. `src/index.css`：`@import '@dianziji/stage-settings/styles.css';`
2. `src/App.tsx` 顶层：`useSettingsRoot()`
3. 对话框（在任何提前 `return` 之前）：
   ```ts
   const tw = useTypewriter(beat?.text ?? '')
   const next = () => (tw.done ? go(idx + 1) : tw.finish())       // 点正文用它
   const auto = useAutoPlay({ text: beat?.text ?? '', canAdvance: idx < last, onNext: () => go(idx + 1), ready: tw.done, paused: !active || sheet || tray || cursor.viewing || hidden || !!error })
   const [settings] = useSettings()
   const pick = (c: string) => settings.choiceMode === 'send' ? void say(c) : 填进输入框(fillChoice(text, stack, c))
   // 或者照官方例子：一律直接发、第一次确认一次（src/game/ChoiceConfirm.tsx + choicePref.ts），面板去掉 choice
   ```
   正文显示 `tw.shown`；字号写成 `text-[calc(15px*var(--dzj-font-scale,1))]`。
   `paused` 写全「玩家在干别的」：**不在游玩页**（地图 / 图册时对话框常常只是藏起来没卸载）、开着输入框 / 快捷指令 / 弹窗、回看旧的一轮、对话框藏起来、出错提示开着。
4. 标题栏：照抄例子的 `src/game/PlayControl.tsx`（「▶ 自动」+「调节」点开 `<SettingsPanel />`）。

## 换样子

覆盖四个颜色变量、`className` 调尺寸 / 窄屏只留图标、或者只用 hook 自己画——见包 README「界面是舞台自己的」。★不要改 `packages/stage-settings/`。
