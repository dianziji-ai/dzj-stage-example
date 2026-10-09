---
name: stage-performance
description: 舞台的性能红线：动画只动 transform/opacity、手机不用 blur 和大滤镜、不每帧重渲染 React、大层纹理上限、看不见就暂停、减少动态效果、视频两段式。做动画、特效、粒子、视频，或页面卡顿时用。
---

# 性能

舞台主要在**手机**上玩。特效再好看，掉帧就是 bug。

## 红线
1. **动画只动 `transform` 和 `opacity`**：它们在合成层跑，不触发排版。进度条用 `scaleX` 不用 `width`；位移用 `translate` 不用 `top/left`。
2. **手机上不用 `backdrop-filter: blur` 和 `filter`**：每帧都要重算，背后还有在动的立绘就更糟。要玻璃感用「半透明渐变 + 高光 + 内描边 + 阴影」（例子：`src/styles/surfaces.css` 的 `glass`，只在鼠标设备上才加一层轻模糊）。`filter`、`mask-image`、`mix-blend-mode` 每个都会多一次整层离屏合成。
3. **大层的尺寸 × 设备像素比别超过 4096px**（iOS 纹理上限）：超了退化成 CPU 每帧重画，整屏掉到个位数帧率。全屏渐变光效别用 `200vmax` 这种尺寸。
4. **不让 React 每帧重渲染**：逐帧的动画用 CSS 动画 / Web Animations（`el.animate`）/ 直接改 DOM（例子：`Dialogue.module.css` 的「▼ 继续」只用 CSS 动画；对话框按区订阅，AI 写字时只有它重画）。流式高频更新的组件用 `memo`、传原始值。
5. **按时间算速度，别按帧**：刷新率 60 / 120Hz 不同，按帧算速度就不一样。
6. **看不见就暂停**：页面切后台（`visibilitychange`）、组件不在屏幕上（`IntersectionObserver`）就停掉动画和循环。
7. **尊重「减少动态效果」**：`src/styles/animations.css` 里已经全局处理；自己写的 JS 动画检查 `matchMedia('(prefers-reduced-motion: reduce)')`。
8. **同时在跑的动画别太多**：粒子、飘落物手机上减半；`document.getAnimations().length` 过百就要砍。

## 常用写法
```css
/* 立绘呼吸：只动 transform */
@keyframes breathe { 50% { transform: translateY(-0.6%) scale(1.006) } }
```
```ts
// 一次性的进场 / 进度：Web Animations，不走 React 状态
el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 300, fill: 'forwards' })
```

## 视频
- **一律用 SDK 的 `useTapVideo` + `TAP_VIDEO_ATTRS`**（见 `docs/sdk-react.md#视频usetapvideo`），别自己写 `<video autoPlay loop>`。
- 两段式：先静态展示（封面图 `<img>` + ▶），点了才播；列表 / 图册的格子里只放封面图，不放 `<video>`。
- 播完 / 退出原生全屏 / 出错 / 6 秒起不来 → 清源收场（hook 已做）；关闭按钮一直在。

## 自检
- Chrome 开发者工具 → Performance，手机模拟 + CPU 降速 4×，录一段：没有长时间的红条（长任务），帧率稳定。
- 首屏图预加载了吗？大图是 webp 吗？
- 动画里有没有 `width` / `height` / `top` / `left` / `filter`？
