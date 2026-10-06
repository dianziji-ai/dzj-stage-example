# 电脑 / 手机

**默认两边都适配。** 只做竖屏，不做横屏。

## 断点

- 只用一个断点 `lg`（1024px）：以下是手机布局，以上是电脑布局。
- Tailwind **移动优先**：先写手机的样式，再用 `lg:` 覆盖成电脑的。
- 平板（768–1023px）走手机布局，但内容收成居中一列（`mx-auto max-w-2xl`），别撑满。

```tsx
<div className="px-3 text-sm lg:px-6 lg:text-base">…</div>
```

## 安全区（刘海、灵动岛、home 条）

**作者只管一件事：贴着屏幕边的东西加工具类。** 剩下的平台和 SDK 自动处理。

| 工具类（SDK 自带，引了 `@dianziji/stage/styles.css` 就有） | 用在 |
|---|---|
| `pt-safe` | **贴着屏幕顶部的东西**（顶栏、返回按钮）：不加，iPhone 的状态栏 / 刘海会压住它 |
| `pb-safe` | 贴着屏幕底部的东西（home 条） |
| `px-safe` | 横向贴边的东西 |
| `pb-composer` | 底部输入条（电脑上原地输入时用） |
| `top-[calc(var(--safe-top)+60px)]` | 浮在顶栏下面的东西：直接用变量 `--safe-top` / `--safe-bottom` / `--safe-left` / `--safe-right` |

★**让位的是内容不是容器**：背景铺满到屏幕边（`fixed inset-0`），只用 padding 把按钮、文字顶开。

### 背后是怎么做的（了解即可）

浏览器只把刘海、home 条的高度（`env(safe-area-inset-*)`）告诉**最外层的页面**，iframe 里永远是 0。舞台线上就跑在平台页面的 iframe 里，所以：

1. 平台在外层量出真实高度，发消息推给舞台（`stage:viewport`，格式见 [api.md](api.md#平台和舞台之间的消息)）。
2. SDK 收到后写进 `--safe-*` 变量，工具类用的就是它们。`StageBoot` 启动时自动开始接收；不用 React 的舞台自己调一次 `watchViewport()`。
3. 本地 `npm run dev` 时舞台就是最外层页面，直接读系统的 `env()`。

前提：`index.html` 的 `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">` 要带 `viewport-fit=cover`，不然 iOS 的 `env()` 恒为 0。官方例子已经写好，别删。

## 输入

- 整页 `fixed` 铺满，键盘弹出时页面不会被推走。
- **手机上的输入一律走全屏输入层**（官方例子的 `components/InputSheet.tsx`）：在小屏上键盘一弹，原地输入框会被挡住或把布局挤乱。
- 输入框字号至少 16px：iOS 小于 16px 聚焦时会自动放大整页。

## 布局

- 手机竖屏一屏放得下就放；**放不下宁可让内容滚动，也别硬挤**：硬塞 + `overflow: hidden` 会让元素互相重叠。
- 顶栏在手机上尽量紧凑（一条细胶囊），立绘才是主角。
- 可点区域至少 40×40px。

## 验收

- 电脑：1280 宽、2000 宽各看一遍（真实电脑屏幕很宽，别只看 1280）。
- 手机：375×667（小屏）、390×844（刘海屏）。
- 键盘弹起、收起；横屏不用管。
