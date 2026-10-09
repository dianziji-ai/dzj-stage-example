# 自动播放

对话一句一句播，玩家可以打开「自动」：到点自动翻下一句。官方模块 `@dianziji/stage-autoplay`（在 `packages/stage-autoplay/`，只依赖 react），完整说明见它的 [README](../packages/stage-autoplay/README.md)。

## 规则（模块定死，所有舞台一样）

- **等多久** ＝ 句末停顿 + 字数 × 每字停留，最多 12 秒；空白、标点不算字。默认每字 90 毫秒、句末 1.5 秒，玩家在设置里调，存本机。
- **不翻的时候**：最后一句（选项出来了，绝不替玩家选）；AI 还没写出下一句（等它写出来再接着播）；舞台说暂停；页面在后台。
- 玩家自己点了下一句：从头计时。

## 接进你的舞台（三步）

1. `src/index.css` 加一行 `@import '@dianziji/stage-autoplay/styles.css';`
2. 对话框里调计时（在任何提前 `return` 之前）：
   ```ts
   const auto = useAutoPlay({ text: beat?.text ?? '', canAdvance: idx < last, onNext: () => go(idx + 1), paused: sheet || tray || cursor.viewing || hidden || !!error })
   ```
   `paused` 写你舞台里「玩家在干别的」的所有情况：开着输入框 / 快捷指令 / 弹窗、在回看旧的一轮（`useTurnCursor().viewing`）、对话框藏起来、出错提示开着。
3. 放界面：照抄例子的 `src/game/AutoPlayControl.tsx`（低调的「▶ 自动」+「调节」小图标，点开浮出 `<AutoPlaySettings />`）。

## 换样子

默认很低调：和标题栏别的小按钮一个样子，开着时「自动」下面一道发丝线长满就翻。
- 换颜色：覆盖 `--dzj-ap-accent / --dzj-ap-track / --dzj-ap-fg / --dzj-ap-muted`（例子在 `src/styles/surfaces.css` 末尾）；
- 窄屏只留图标：加 `dzj-ap-iconic`，或媒体查询藏 `.dzj-ap-label`；
- 整个换掉：不用 `<AutoPlayButton>`，拿 `useAutoPlay` 返回的 `on / toggle / running / duration / cycle` 自己画。

★不要改 `packages/stage-autoplay/`（只读，官方升级时整包替换）。
