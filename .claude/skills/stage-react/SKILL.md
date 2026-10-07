---
name: stage-react
description: 舞台的 React 写法：组件拆分、文件组织、按分区订阅 SDK 数据、状态放哪、样式（Tailwind / styles / CSS Modules）。写组件、接数据、拆文件时用。
---

# React 写法

## 组件
- 函数组件 + hooks。**一个文件只导出一个组件**，文件名＝组件名（`Dialogue.tsx`）；只给它自己用的小组件可以写在同一个文件里不导出（例子：`game/pages/LogPage.tsx` 的 `PlayerAvatar`）。
- 按功能分目录：`src/game/`（这张卡的游戏）、`src/xxx/`（独立玩法，如例子的 `src/claw/` 抓娃娃）、`src/components/`（通用小件，如 `InputSheet`）。
- 一个组件管了两件事就拆；文件很长（几百行）的先看能不能把纯逻辑挪进 `logic.ts`、把子块拆成组件。小游戏这种状态多的组件可以长一点（例子：`claw/ClawGame.tsx`），但逻辑照样放 `claw/logic.ts` 并配测试。
- 纯逻辑（存档怎么变、画面怎么解读、文案怎么拼）不写在组件里：放 `logic.ts`，写成纯函数，配 `logic.test.ts`。
- 弹窗、提示条自己做组件（例子：`game/Tip.tsx` + `tipStore.ts`）。不要 `alert` / `confirm`。

## 接 SDK 的数据（按分区订阅）
AI 一个字一个字写的时候，**只让用到「正在变的那个区」的组件更新**：

```tsx
// 对话框自己订阅正文和选项
function Dialogue() {
  const body = useZoneText('narrative')     // 正文跟着流变
  const choices = useZoneList('action')     // 选项
  ...
}
// 立绘自己订阅表情：写完才换、这一轮没写到用上一次的
function Sprite() {
  const face = useZoneData('face', { hold: true, complete: true })
  ...
}
// 顶栏只要存档里的几个数：选择器 + shallowEqual
// import { shallowEqual, useStage } from '@dianziji/stage/react'；import type { SessionState } from '@dianziji/stage'（★SessionState 在根入口，不在 /react）
const { love, coins } = useStage((s: SessionState<MySave>) => ({ love: s.save.love, coins: s.save.coins }), shallowEqual)
// 只要方法：永远不因状态重渲染
const { send, setSave } = useStageActions()
```

- ✗ 不要在 `App` 里 `useStage()` 拿全部再一层层往下传：AI 每写一个字整棵树都重画。
- 例子的做法：`game/useGame.ts` 只订阅「一轮才变一次」的；`useDialogue()` / `useThought()` 各自按区订阅。
- 结算结果（好感 +3、解锁 CG）看 `lastTurn` 的 `prev` / `next`。

## 状态放哪
| 数据 | 放哪 |
|---|---|
| 要跨刷新、跨设备保留的游戏数据 | 存档（`setSave`），字段对上存档结构 |
| 这一页的界面状态（弹窗开没开、选中哪个） | 组件 `useState` |
| 好几个组件共用、不进存档的 | 小 store（`useSyncExternalStore`，例子：`tipStore.ts`） |
| 本机偏好（音乐开关、对话框展开）、「看过了」这类小记号 | SDK 的 `local`（`local.get / set / getJSON / setJSON / remove`）：自动按卡分开、隐私模式不报错。**不许直接用 `localStorage`**——所有舞台在同一个域名下共用一个抽屉，同名的键会和别的卡互相覆盖 |

## 样式
- **Tailwind 类名优先**，直接写在组件上。
- 全局复用的（配色变量、安全区工具类、动画、玻璃质感、markdown）在 `src/styles/`，一个文件管一类；要加就加到对应文件或新建一个，在 `src/index.css` 里 `@import`。
- 只属于某个组件、Tailwind 写不动的：`组件名.module.css` 放在组件旁边（例子：`game/Typewriter.module.css`）。注意 CSS Modules 里的 `@keyframes` 名也会加哈希，动画关键帧写在同一个模块里。
- **不往 `src/index.css` 里写样式**（只做引入）。
- 颜色用 `src/styles/theme.css` 里的变量 / Tailwind 主题色（`bg-panel`、`text-muted`），别到处写死色值。

## 常见 bug（这些都真出过）
- `useEffect(() => xxx())` 箭头函数隐式返回了一个值（比如 Promise）→ React 当成清理函数调，报错白屏。写成 `useEffect(() => { xxx() })`。
- StrictMode 下组件会挂两次：rAF、定时器、订阅一定要在清理函数里取消；ref 里存的「进行中」标记要清零。
- 同一个组件里两个 rAF 循环共用一个 ref → 清理时误取消另一个。各用各的 ref。
- 列表 `key` 别用文本内容（可能重复），用 id 或稳定的序号。
- 渲染函数里别写 ref、别 `Date.now()`。
