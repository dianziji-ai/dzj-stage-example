---
name: stage-autoplay
description: 舞台的自动播放（官方模块 @dianziji/stage-autoplay）：到点自动翻下一句，等多久＝句末停顿＋字数×每字停留，玩家在设置里调。作者要「自动播放 / 自动翻页 / auto 模式 / 一句一句自己往下走」，或要改自动播放按钮、设置面板的样子时用。
---

# 自动播放

官方模块 `packages/stage-autoplay/`（`@dianziji/stage-autoplay`，只依赖 react）。**先读** `docs/autoplay.md` 和 `packages/stage-autoplay/README.md`。

## 规则

1. **计时一律用模块的 `useAutoPlay`，不要自己写 setTimeout 翻页。** 停在最后一句、等 AI 写出下一句、后台暂停、换句从头计时这些行为模块已经测好了，自己写容易漏（典型 bug：最后一句替玩家点了选项；生成中翻到半截的句子）。
2. **`useAutoPlay` 放在对话框组件的提前 `return` 之前**；对话框藏起来用 `paused` 停，不要条件调用。
3. **`canAdvance` 只在「后面真有下一句」时为 true**：`idx < last`。最后一句（选项）和「AI 还在写、已经播到最新一句」都是 false。
4. **`paused` 把「玩家在干别的」写全**：输入框 / 快捷指令 / 弹窗开着、回看旧的一轮（`useTurnCursor().viewing`）、对话框藏起来、错误提示开着、**切到别的页面**（地图 / 图册时对话框常常只是藏起来没卸载，不算上就会在后台一直翻）。
5. **`onNext` 用舞台自己的翻页函数**（和点「下一句」走同一个），不要另写一套。
6. **界面舞台自己定**：默认的 `<AutoPlayButton>` 很低调（和标题栏小按钮一个样子），作者要别的样子就覆盖 CSS 变量 / 加 className / 整个换掉只用 hook，**绝不改 `packages/stage-autoplay/`**（只读，`npm test` 会拦）。
7. 设置（开关、两项时间）存在玩家本机，模块自己管；**不要把它们放进存档**。

## 接法（照抄例子）

- `src/index.css`：`@import '@dianziji/stage-autoplay/styles.css';`
- `src/game/Dialogue.tsx`：
  ```ts
  const auto = useAutoPlay({ text: beat?.text ?? '', canAdvance: idx < last, onNext: () => go(idx + 1), paused: !active || sheet || tray || cursor.viewing || mode === 'hidden' || !!error })
  ```
- `src/game/AutoPlayControl.tsx`：`<AutoPlayButton state={auto} onSettings={…} />` + 点开的浮层里 `<AutoPlaySettings />`（点外面 / Esc 收起）。
- `src/styles/surfaces.css` 末尾：`--dzj-ap-*` 四个变量换成卡的配色。

## 自检

- 打开「自动」：一句播完到点翻；最后一句停住、选项不被点；发一句话后 AI 边写边播、播到最新一句等着；
- 打开输入框 / 快捷指令 / 回看：不翻；关掉后从头计时；
- 手机标题栏放得下（放不下就 `dzj-ap-iconic` 只留图标），文字不竖排；
- 设置里调慢 / 调快，预览秒数跟着变，刷新后还在。
