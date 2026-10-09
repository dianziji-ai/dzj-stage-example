# @dianziji/stage-autoplay

官方维护的版本记录（暂未发布 npm）。★作者开发时不要改这个包：不够用向官方提需求，官方出新版时整个替换。

## 0.1.0 — 2026-10-09

首个版本：自动播放独立模块（只依赖 react）。

- `delayFor(text, prefs)`：句末停顿 + 字数 × 每字停留，最多 12 秒；`countChars` 只数要读的字。
- `useAutoPlay({ text, canAdvance, onNext, paused })`：到点翻一句；最后一句 / 还没有下一句时原地等；换一句、暂停后恢复都从头计时；切到后台暂停。
- `<AutoPlayButton>`：开关 + 倒计时环（CSS 动画，不每帧重画）；`<AutoPlaySettings>`：开关 + 两条滑杆 + 预览。
- 设置存玩家本机（`createAutoPlayStore` / `autoPlayStore`），读写失败照常可用。
