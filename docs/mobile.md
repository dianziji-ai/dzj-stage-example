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

安全区和键盘是 5 个 CSS 变量（px），由两部分配合：例子的 `src/styles/safe-area.css` 给默认值（本地读系统的 `env(safe-area-inset-*)`），SDK 的 `watchViewport()`（`main.tsx` 里调）本地维护键盘 `--kb`、线上（iframe 里）用平台推进来的值覆盖全部。★`index.html` 的 `<meta name="viewport" content="…, viewport-fit=cover">` 是前提，没有它 iOS 的 `env()` 恒为 0。换掉这两个文件时别丢：

| 变量 | 是什么 |
|---|---|
| `--safe-top` / `--safe-right` / `--safe-bottom` / `--safe-left` | 刘海、home 条等要让开的距离 |
| `--kb` | 软键盘挡住了底部多少（没弹＝0） |

- 本地开发（舞台是顶层页面）：读系统的 `env(safe-area-inset-*)`，键盘用 `visualViewport` 算。
- 线上（舞台在平台 iframe 里，`env()` 恒为 0）：平台量好推进来。

写样式时用工具类（在 `src/styles/safe-area.css`）：

| 工具类 | 作用 |
|---|---|
| `pt-safe` / `pb-safe` / `px-safe` | 给刘海、home 条让位 |
| `pb-composer` | 底部安全区和键盘取大的那个，再加 12px：底部输入条用它 |

★**让位的是内容不是容器**：背景铺满到屏幕边，只用 padding 把按钮、输入框顶开。iOS 顶部一定要给 `pt-safe`，不然状态栏会压住顶栏。

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
