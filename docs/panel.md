# 本局面板 `@dianziji/stage-panel`

每个舞台都带的「本局」面板：这一局的概览、初始设定、图册、存档（玩家可以自己改）、分区、指南。（对话原文和每轮消耗不在面板里：网站的「记录」里看。）
**上线也给玩家看**，是平台内置的预览，不是开发工具。

## 装上

依赖 `@dianziji/stage`（同一个仓库里已经有了）和 React 19。主样式里按顺序引（Tailwind 才会扫描到包里的类名）：

```css
@import 'tailwindcss';
@import '@dianziji/stage/styles.css';        /* 先引：配色变量在这里 */
@import '@dianziji/stage-panel/styles.css';
```

## 用法

```tsx
import { StagePanel } from '@dianziji/stage-panel'

<StagePanel stage={stage} />     // 右下角一颗「本局」按钮，点了打开
```

想把入口放进自己的菜单（推荐：游戏有自己的顶栏 / 菜单时）：

```tsx
import { openStagePanel, StagePanel } from '@dianziji/stage-panel'

<StagePanel stage={stage} button={false} />          // 只挂面板，不要悬浮按钮
<button onClick={openStagePanel}>本局</button>        // 任何地方都能开
```

开关是全局的：`openStagePanel()` / `closeStagePanel()` / `toggleStagePanel()`，组件里要知道开没开用 `useStagePanelOpen()`。

- **电脑**（≥1024px）：居中弹窗，左边竖排标签；点遮罩、✕、Esc 关。
- **手机**：全屏，标签横排可滑，自动给刘海和 home 条让位。
- **性能**：面板本体第一次打开才下载（游戏首屏只多一颗按钮；鼠标指上去就开始预下载）。数据就是网站推来的快照（`stage.snapshot()` / `stage.subscribe`），打开就是此刻的样子，之后跟着变，不用刷新；图册打开那一页才请求，缩略图懒加载、每页 24 张。

## 参数

| 参数 | 默认 | 说明 |
|---|---|---|
| `stage` | （必填） | `createStage()` 的结果 |
| `button` | `true` | 要不要右下角那颗悬浮按钮；`false`＝自己放入口，调 `openStagePanel()` |
| `title` | `'本局'` | 面板标题，也是按钮上的字 |
| `buttonClassName` | `'right-3 bottom-3'` | 悬浮按钮的位置（Tailwind 类名，比如 `'left-3 top-20'`）；安全区自动加 |
| `dev` | 看快照 | 显示开发信息（完整模型、线路、消息 id、设定 key、原文…）。作者本人在网站里本地开发时（快照 `meta.dev` 为 true）自动显示；想一直显示就传 `import.meta.env.DEV` |

## 六个标签

所有人都能看全部标签；开发信息只在开发模式下多出来。

| 标签 | 玩家看到 | 开发模式多出 |
|---|---|---|
| 概览 | 玩家头像和 ID、卡、这一局（「切到对话模式看这一局」按钮，`stage.open('chat')`）、模型（快照的 `meta`）、最近几轮共花多少能量 | 卡 id、完整模型、线路、网站、图床、分区数、存档结构有没有定义、有没有在生成 |
| 初始设定 | 进场时填了什么（没填的写「没填」） | 每项的 key（舞台按 key 取值）、原文（AI 看到的就是它） |
| 图册 | 和网站画廊同一套解锁：玩到对应轮数开相册，锁着的显示还差几轮 | — |
| 存档 | JSON 直接改、保存（网站按存档结构校验，不对会写明哪里不对）；保存成功后显示存好的那份；「填入开局存档」；折叠着存档结构（可复制） | — |
| 分区 | 每个区：名字、id、类型、最近一轮写了什么；展开看完整值、AI 写法、说明；原始 JSON 开关 | — |
| 指南 | 平台的操作去哪做：换模型、调参数（工具栏 → 模型）、挂 MOD（工具栏 → MOD）、本局设定与记忆（工具栏 → 本局）；改 / 删 / 回溯记录要先「切到对话」，在 AI 回复下的 编辑 / 重生 / 回溯到此处 和玩家消息的删除里做；附一个「切到对话模式」按钮（`stage.open('chat')`） | — |

**玩家在面板改了存档，游戏怎么知道？** 保存时标 `source: 'panel'`，SDK 会广播 `{ type: 'save', source: 'panel' }`。用了 `StageBoot` / `createSession` 的舞台不用管：会话自动换成新存档（过一遍 `normalize`），`<StageToaster />` 弹「存档已更新」。

## 换肤

面板、SDK 的提示和保存按钮共用 11 个配色变量。在自己的样式里覆盖就行（写在 import 后面），**不用改包里的代码**：

| 变量 | 用在哪 | 默认 |
|---|---|---|
| `--color-sp-bg` | 面板底色 | `#f6f5f2` |
| `--color-sp-card` | 卡片、按钮、提示的底 | `#ffffff` |
| `--color-sp-code` | 代码块、JSON、缩略图占位的底 | `#fbfaf8` |
| `--color-sp-line` | 分隔线、边框 | `#e7e3dc` |
| `--color-sp-text` | 正文字 | `#1d1b18` |
| `--color-sp-muted` | 次要的字（标题、说明、时间） | `#86817a` |
| `--color-sp-accent` | 强调色：当前标签、主按钮、链接、进度条 | `#d9480f` |
| `--color-sp-on-accent` | 强调色上的字 | `#ffffff` |
| `--color-sp-accent-soft` | 强调色的浅底：小标签、提示条、头像占位 | `#fde8dc` |
| `--color-sp-danger` | 出错的字 | `#c42b2b` |
| `--color-sp-ok` | 成功的字 | `#15803d` |

**一套固定配色**（官方例子的粉色奶油风，见例子的 `src/styles/panel-skin.css`）：

```css
:root {
  --color-sp-bg: #fff8f1;
  --color-sp-card: #ffffff;
  --color-sp-code: #fffaf5;
  --color-sp-line: #fbe3ea;
  --color-sp-text: #4a2f2a;
  --color-sp-muted: #9a7b72;
  --color-sp-accent: #ec4899;
  --color-sp-on-accent: #ffffff;
  --color-sp-accent-soft: #fdf2f8;
  --color-sp-danger: #e11d48;
  --color-sp-ok: #059669;
}
```

**深色**（或跟随系统明暗：把下面这段包进 `@media (prefers-color-scheme: dark) { … }`）：

```css
:root {
  --color-sp-bg: #141217;
  --color-sp-card: #1e1b22;
  --color-sp-code: #18161c;
  --color-sp-line: #2e2a35;
  --color-sp-text: #ece8f1;
  --color-sp-muted: #958fa0;
  --color-sp-accent: #f472b6;
  --color-sp-on-accent: #1a0b14;
  --color-sp-accent-soft: #3a1d2e;
  --color-sp-danger: #fb7185;
  --color-sp-ok: #34d399;
}
```

**其他**：

- **字体**跟着页面走（面板没设字体），给 `body` 换字体面板也跟着换。
- **悬浮按钮**的位置和字用 `buttonClassName` / `title`；想要完全不一样的按钮，就 `button={false}` 自己画一个，点了调 `openStagePanel()`。
- 遮罩、圆角、阴影、动画这些不是变量，固定不可改（SDK 只读，见下一节）。

## 不够用

面板是 SDK 的一部分，**只读、不改源码**。能用参数（`title` / `buttonClassName` / `button={false}` / `dev`）和配色变量解决的都能自己定；要加标签、改页面内容，向官方提需求。
