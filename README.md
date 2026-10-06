# 电子姬舞台 · 官方例子

一张完整的舞台卡（galgame「电子姬的同居日常」，卡 `ca44070d`）+ 舞台 SDK。
**从这里起步**：跑起来看它能做到什么，再把游戏换成你自己的。

React 19 + Vite + Tailwind CSS v4。手机优先（竖屏），电脑也有专门的布局。

## 跑起来

1. 网站上进入你的卡（走完进场），工具行点 **「开发」→ 生成 token**。
2. 复制弹窗里的两行，贴进项目根目录的 `.env`：
   ```
   VITE_STAGE_API=…
   VITE_STAGE_TOKEN=st_…
   ```
3. ```bash
   npm install
   npm run dev      # 打开终端里打印的地址
   npm test         # 游戏规则的测试
   npm run test:sdk # 两个 SDK 包的测试（带覆盖率门槛）
   ```

在这里发的消息，回到网站上同一局里也能看到。

> ⚠️ `.env` 里的 token 能在这一局里聊天、花你的能量，已经写进 `.gitignore`，别外传。token 7 天过期；换了模型或线路要重新生成。

## 上线

```bash
npm run pack     # 打包 + 压成 stage.zip
```

网站编辑器 →「舞台」→「上线」上传 `stage.zip`（目前只有管理员能传）。玩家点开这张卡、走完开场，第一次会看到授权框，同意后进入舞台。

- 线上的 token 由平台签好，放在舞台地址 `#` 后面传进来（`readLaunch()` 读，读完从地址栏擦掉）；**不读 `.env`**。
- `.env` 只在 `npm run dev` 时用。打包时 `vite.config.ts` 会把它强制清空，开发 token 不会进 `stage.zip`。
- 图片、字体这类 `public/` 里的文件用 `import.meta.env.BASE_URL` 拼路径（`${import.meta.env.BASE_URL}assets/bg.webp`），别写 `/assets/…`：上传后舞台在 `{卡id}/{版本号}/` 目录下，绝对路径会找不到。

## 目录

```
packages/                     舞台 SDK（npm workspaces；可以直接改，各有 README 教程）
  stage/        @dianziji/stage        SDK（分三层）
    src/client/   客户端：接口 + 收流（零依赖）
    src/session/  会话引擎：会话 / 存档器 / 分区解析与追踪
    src/view/     markdown 渲染、安全区
    src/react/    React 外壳
    test/         SDK 的测试（和 src/ 一一对应）
  stage-panel/  @dianziji/stage-panel  「本局」面板（每个舞台都带，上线也给玩家看；能换肤）
src/                          游戏本体（换成你的卡就改这里）
  main.tsx      启动：<StageBoot> + 首屏预加载 + 游戏规则（rules）
  stage.ts      项目共用的 stage 连接（读 .env）
  App.tsx       页面组装：游玩页 / 地图 / 图册 / 记录 / 抓娃娃 / 菜单
  game/
    content.ts    这张卡的素材和词表：地点、表情、立绘 / 背景地址、CG 名字
    logic.ts      游戏规则（纯函数 + 单测）：存档怎么变、附给 AI 的状态、画面怎么解读
    rules.ts      交给框架的规则：normalize（存档补默认）/ onTurn（一轮写完怎么改存档）
    useGame.ts    游戏状态 hook：只订阅「一轮才变一次」的；对话框 / 心声各自按区订阅
    Scene / Hud / Dialogue / Choices / ThoughtBubble / Pages / GameMenu / Tip …   界面
  claw/         抓娃娃机（这张卡专属的小游戏，演示「舞台里能放任何玩法」）
  audio/        8-bit BGM（预渲染循环）+ 音效
  index.css     Tailwind 入口 + 奶油风 + 安全区工具类 + 面板换肤（--color-sp-*）
```

## 改成你自己的卡

| 想改什么 | 改哪里 |
|---|---|
| 地点、表情、素材图 | `game/content.ts`、`public/assets/` |
| 存档里有什么、每轮怎么变 | `game/logic.ts`（`GameSave` / `nextSave`）+ `game/rules.ts`；网站编辑器「舞台」页的存档结构要对上 |
| 每句话附给 AI 的状态 | `game/logic.ts` 的 `stateForAi`（`useGame` 的 `send` 用 `withState` 附上） |
| 画面 | `game/` 下的组件；分区名（scene / face / narrative …）要和你卡里定义的分区对上 |
| 不要的玩法 | 直接删 `claw/`、`audio/` 和 App 里对应的入口 |

## 写舞台的三步（这个例子就是这么写的）

```tsx
// ① main.tsx：启动外壳。读这一局、预加载、建好会话；游戏规则从这里传进去（都可选）
<StageBoot
  stage={stage}
  preload={(snap) => [背景图]}                          // 首屏要先下好的图
  normalize={(raw, snap) => 补好默认值的存档}             // 读回来的存档过一遍（玩家在面板改了存档也会过一遍）
  onTurn={({ raw, zones, save }) => 这一轮写完后的新存档}  // 游戏规则：AI 这一轮写了什么，存档怎么变
>
  <App />
</StageBoot>

// ② 组件里拿数据
const g = useStage<MySave>()        // 全部：snap / history / live / busy / said / error / save / lastTurn / zones …
                                    //       + send / retry / dismissError / loadOlder / setSave / saveNow / readZones

// ★按分区订阅（推荐）：引擎知道 AI 写到哪个区了，只有用到「正在变的那个区」的组件更新
const body  = useZoneText('narrative')                              // 正文：跟着流一个字一个字变；新一轮开始是 ''
const face  = useZoneData('face', { hold: true, complete: true })   // 表情：写完才换；这一轮还没写到用上一次的
const items = useZoneList('action')                                 // 选项
const p     = useTurnProgress()                                     // 这一轮写到哪个区了（进度条；AI 写完就是 null）

// 只要一部分：选择器（只有选出来的值变了才重画）；只要方法：useStageActions（永远不重画）
const love = useStage((s: SessionState<MySave>) => s.save.love)
const { busy, error } = useStage((s) => ({ busy: s.busy, error: s.error }), shallowEqual)
const { send, setSave } = useStageActions()

// ③ 现成组件（都可选）
<StagePanel stage={stage} />        // 本局面板（@dianziji/stage-panel）
<StageToaster />                    // SDK 的结果自动弹顶部提示
<SaveIndicator />                   // 「正在保存… / ✓ 已保存」，也是手动保存按钮；quiet＝只在存档时冒小图标
<TurnProgress />                    // 「● 正在写 · 表情」+ 进度条
```

`{ hold: true, complete: true }`：**hold**＝这一轮还没写到这个区时用上一次的值（不消失）；**complete**＝这个区写完才换（不闪半截值）。表情、场景、状态这类「一直该有个值」的区两个都加；正文、选项都不加。

框架替你做掉的（每个舞台都要、自己写容易出 bug）：

| | |
|---|---|
| 发消息 | 点了先显示这句、进入生成中；发失败撤回；同一时间只有一轮。SDK 原样发，不往里加东西 |
| 收流 | `live` 是到目前为止的原文，写完自动进 `history`；断线 / 超时 / 上游出错都会结束这一轮并给 `error` |
| 分区 | 每帧最多解析一次；内容没变的区是同一个对象；记下写完没有、最近写过的值、正在写哪个区 |
| 出错 | `error.error.code` 决定给什么按钮；连接 / 上游出错时 `error.retry` 有值，`retry()` 原样再发 |
| 刷新 | 那一轮还在生成：接着收（会从头回放） |
| 历史 | `loadOlder()` 每次往前翻 20 条，去重 |
| 存档 | `setSave` 本地立刻生效，存档器合并连续改动、串行发、关页面时发完；玩家在本局面板改了存档，`save` 自动换成新的 |
| 结算 | `onTurn` 在 AI 这一轮写完的那一刻算一次。玩家提前走了这一轮就不算（不补算）；存档和历史允许对不上，AI 会容错 |

`onTurn` 里取值用安全取值工具（AI 不一定每轮都写每一行，直接 `zones.status.value.xxx` 一漏写就崩）：

```ts
import { zoneNum, zoneText, zoneList, zoneData } from '@dianziji/stage'

onTurn: ({ zones, save }) => ({
  ...save,
  love: Math.min(100, Math.max(0, save.love + (zoneNum(zones, 'status', '好感变化') ?? 0))),  // 没写 → null
  mood: zoneText(zones, 'status', '心情') || save.mood,                                       // 没写 → ''
})
```

万一 `onTurn` 自己抛错：这一轮存档不变、游戏照常玩，顶部提示「这一轮的状态没算上」，控制台有原因。
`lastTurn` 是最近一次结算的结果（`prev` / `next` 两份存档），拿来做「好感 +3」「解锁新 CG」这类动效：比较两份就行。

### 附给 AI 的「此刻状态」

存档 AI 看不到。想让它知道当前数值，发话时自己附上（附不附、附什么由舞台决定）：

```ts
send(withState('我们去公园吧', { 好感: 42, 地点: '主人的房间' }))
```

`<dj_state>` 是平台约定的标签：发给 AI 时历史里旧的整块删掉、只留最新一份并去掉标签（不会越聊越长），网站聊天页 / 记忆摘要 / 搜索都会藏掉它；里面的内容照常参与世界书扫描（标签本身不参与）。规则：**每次带一份完整的，没带的就当没有了**。显示玩家的话时用 `splitState(原文).text` 把它藏掉。

## SDK 包

`packages/` 里两个包，**各有自己的使用教程**：

| 包 | 是什么 | 教程 |
|---|---|---|
| `@dianziji/stage` | 舞台 SDK，分三层：`/client` 客户端（零依赖）· 根入口会话引擎 · `/react` React 外壳 | [packages/stage/README.md](packages/stage/README.md) |
| `@dianziji/stage-panel` | 「本局」面板：概览 / 初始设定 / 历史消耗 / 图册 / 存档 / 分区，**上线也给玩家看**；能换肤 | [packages/stage-panel/README.md](packages/stage-panel/README.md) |

- 入口直接指向源码：**想改就改**，保存刷新就生效，不用打包、不用发版。改了在那个包的 `CHANGELOG.md` 记一笔，以后官方出新版好对照合并。
- 能传参数、覆盖配色变量解决的先用参数和变量，升级时最省事。
- 两个包都用 Tailwind：`index.css` 里引了它们的样式入口，Tailwind 才会扫描到包里的类名。
- 测试跟着包走（`test/` 和 `src/` 一一对应，带覆盖率门槛）：`npm run test:sdk`。例子自己的测试（`src/**/*.test.ts`）用 `npm test`。

## 电脑 / 手机

- 断点 `lg`（1024px）：以上是电脑布局（一行顶栏、宽对话框），以下是手机布局（细胶囊顶栏 + 右侧竖栏 + 菜单面板，平板上收成居中一列）。只做竖屏。
- 整页 `fixed` 铺满，键盘弹出时页面不会被推走；**手机上所有输入都走全屏**（InputSheet）。
- 安全区和键盘用 CSS 变量，写样式时直接用工具类：

| 工具类 / 变量 | 作用 |
|---|---|
| `pt-safe` / `pb-safe` / `px-safe` | 给刘海、home indicator 让位 |
| `pb-composer` | 底部安全区和键盘取大的那个，再加 12px：底部输入条用它 |
| `--safe-top/right/bottom/left`、`--kb` | 原始变量（px） |

变量由 SDK 的 `watchViewport()` 维护（本地读系统 `env()` 和 `visualViewport`，线上由平台推进来，见 [SDK 教程](packages/stage/README.md#手机安全区和键盘)）。**让位的是内容不是容器**：背景铺满到屏幕边，只用 padding 把按钮、输入框顶开。

## 本局面板

这个例子里：手机在 ☰ 菜单里，电脑点左上角头像（`<StagePanel stage={stage} button={false} />` + 自己的入口调 `openStagePanel()`）。换成了粉色奶油风：`src/index.css` 开头覆盖了 `--color-sp-*`。用法、参数、全部配色变量见 [stage-panel 的教程](packages/stage-panel/README.md)。

## 出错

所有失败都是 `StageError`（`code` 判断、`message` 给玩家看）。各种 code 该给玩家什么见 [SDK 教程的「出错」](packages/stage/README.md#出错)；例子里的完整做法见 `game/ErrorNotice.tsx`。完整接口文档：网站「开放平台 → 文档 → 舞台」。

## 版权

本仓库（官方例子、`@dianziji/stage`、`@dianziji/stage-panel`、舞台协议与文档、美术与音频素材）是电子姬的**专有软件，不是开源软件**。
只允许用来给电子姬平台上的卡开发舞台、并在电子姬平台发布；不得用于其他网站或产品，不得再分发、转售，不得照着舞台协议给别的平台做兼容实现。详见 [LICENSE](LICENSE)。

