# @dianziji/stage · 舞台 SDK

电子姬「舞台」的 SDK：读这一局、发一句话收流、存档、图册，加上会话引擎和 React 外壳。
舞台＝作者用网页做的游戏界面，AI 照常按卡的分区写剧情，舞台把分区渲染成画面。

> 官方例子 `dzj-stage-example` 里的内部包（暂未发布 npm）。入口直接指向源码，**想改就改**，保存刷新就生效；改了在 `CHANGELOG.md` 记一笔，以后对照官方新版合并。

- [分三层](#分三层)
- [五分钟上手（React）](#五分钟上手react)
- [React 外壳 `@dianziji/stage/react`](#react-外壳-dianzijistagereact)
- [会话引擎 `@dianziji/stage`](#会话引擎-dianzijistage)
- [客户端 `@dianziji/stage/client`](#客户端-dianzijistageclient)
- [附给 AI 的「此刻状态」](#附给-ai-的此刻状态)
- [出错](#出错)
- [样式与换肤](#样式与换肤)
- [手机：安全区和键盘](#手机安全区和键盘)
- [测试](#测试)

## 分三层

上层只依赖下层（`test/layers.test.ts` 守着）。用哪层从哪层引：

| 入口 | 是什么 | 什么时候用 |
|---|---|---|
| `@dianziji/stage/react` | **React 外壳**：`StageBoot`、`useStage`、`useZone…`、`StageToaster`、`SaveIndicator`、`TurnProgress` | 用 React 写舞台（推荐） |
| `@dianziji/stage` | **会话引擎**：`createSession`（乐观发送、重试、分区追踪、结算）、`createSaver`、`readZones`、`renderMarkdown`、`watchViewport`。客户端的东西这里也全都能引到 | 不用 React 但想要现成的会话 |
| `@dianziji/stage/client` | **客户端**：`createStage`（3 个接口 + 1 条流）、`StageError`、`withState`、全部数据类型。**零依赖** | 只要接口，状态自己管（Vue、原生 JS、别的框架） |

```
src/client/   客户端（零依赖）          ← test/client/
src/session/  会话引擎、存档器、分区     ← test/session/
src/view/     markdown、安全区           ← test/view/
src/react/    React 外壳                ← test/react/
```

## 五分钟上手（React）

1. 样式：主样式里，`@import 'tailwindcss'` 之后引一行（Tailwind 才扫得到包里的类名）：

   ```css
   @import 'tailwindcss';
   @import '@dianziji/stage/styles.css';
   ```

2. 连接（项目里建一次）：

   ```ts
   // src/stage.ts
   import { createStage, readLaunch } from '@dianziji/stage/client'
   export const stage = createStage(
     readLaunch() ??                                   // 线上：平台放在地址 # 后面的连接
       (import.meta.env.DEV
         ? { api: import.meta.env.VITE_STAGE_API, token: import.meta.env.VITE_STAGE_TOKEN }   // 本地开发：.env
         : { api: '', token: '' }),                    // 线上没从平台进：报「请从电子姬网站进入」
   )
   ```

   本地开发的 token：网站上进入你的卡 → 工具行「开发」→ 生成 token，贴进 `.env`（已 gitignore，别外传）。
   **线上别退回 `.env`**：Vite 打包会把 `.env` 写进 js，玩家打开开发者工具就看得到。官方例子的 `vite.config.ts` 打包时还会把这两项强制清空，照抄。

3. 启动外壳包住整个 App：

   ```tsx
   // src/main.tsx
   import { StageBoot } from '@dianziji/stage/react'

   createRoot(root).render(
     <StageBoot
       stage={stage}
       preload={(snap) => ['/bg.webp']}                         // 首屏要先下好的图（可选）
       normalize={(raw) => ({ love: 20, ...raw })}               // 存档补默认值（可选）
       onTurn={({ zones, save }) => ({ ...save, love: save.love + (zoneNum(zones, 'status', '好感变化') ?? 0) })}  // 游戏规则（可选）
     >
       <App />
     </StageBoot>,
   )
   ```

4. 组件里拿数据、发话：

   ```tsx
   function App() {
     const body = useZoneText('narrative')                    // 正文：跟着流一个字一个字长
     const choices = useZoneList('action')                    // 选项
     const { send } = useStageActions()
     return (
       <>
         <p>{body}</p>
         {choices.map((c) => <button key={c} onClick={() => send(c)}>{c}</button>)}
         <StageToaster />
         <SaveIndicator />
       </>
     )
   }
   ```

完整的例子就是这个仓库的 `src/`。

## React 外壳 `@dianziji/stage/react`

### `<StageBoot>`

包在整个 App 外面，「准备好之前」的事都归它：看板娘加载页 → 读这一局 → 预加载首屏图 → 建好会话 → 淡出交给 App；出错给人话 + 重试，不白屏。刷新时上一轮还在生成会自动接着收。

| 参数 | 说明 |
|---|---|
| `stage` | `createStage(...)` 的结果 |
| `preload?(snap)` | 返回首屏要先下好的图片地址（解码完再进，第一帧不闪）；单张最多等 5 秒，坏图跳过 |
| `normalize?(raw, snap)` | 读回来的存档过一遍：补默认值、丢非法值。玩家在本局面板改了存档也会过一遍 |
| `onTurn?({ raw, zones, save, snap })` | **游戏规则**：AI 这一轮写完那一刻调一次，返回新存档（返回 `undefined`＝不变）。抛错不会卡住游戏：这一轮存档不变，顶部提示「这一轮的状态没算上」 |
| `saveDelay?` | 存档器合并连续改动的时间，默认 800ms |

`onTurn` 只在 AI 写完时算一次：玩家提前走了这一轮就不算（不补算）。存档和历史允许对不上，AI 会容错。

### `useStage()` / `useStageActions()`

```ts
const g = useStage<MySave>()                          // 全部状态 + 方法（任何状态变了都重渲染）
const love = useStage((s: SessionState<MySave>) => s.save.love)                // ★只订阅要的：选出来的值变了才重渲染
const { busy, error } = useStage((s) => ({ busy: s.busy, error: s.error }), shallowEqual)  // 一次取几个
const { send, setSave } = useStageActions()          // 只要方法：引用永远不变，永远不因状态重渲染
```

状态（`SessionState`）：

| 字段 | 说明 |
|---|---|
| `snap` | 启动时读到的这一局：卡、分区、初始设定、玩家、配图库、图床地址… |
| `history` | 已拿到的历史（正序） |
| `hasOlder` | 更早还有 |
| `live` | 正在生成这一轮的原文；没在生成＝`null` |
| `busy` / `said` | 正在生成 / 玩家刚说的那句（等回复时显示） |
| `error` | `{ error: StageError, retry?: string }`：`retry` 有值＝可以「再说一次」 |
| `save` / `canSave` | 存档 / 卡有没有定义存档结构（没有就只改本地） |
| `lastTurn` | 最近一次结算 `{ prev, next, n, raw, zones }`：比较 `prev` / `next` 做「好感 +3」「解锁 CG」动效 |
| `zones` / `held` / `closed` / `writing` | 分区追踪（一般用下面的 `useZone…`） |

方法：`send(text)`（返回发没发出去）、`retry()`、`dismissError()`、`loadOlder()`（往前翻 20 条）、`setSave(next | fn, { now? })`、`saveNow()`（手动保存）、`readZones(raw)`。

### 按分区订阅

AI 一个字一个字写的时候，**只有用到「正在变的那个区」的组件更新**（有渲染次数的测试守着）：

```ts
const body  = useZoneText('narrative')                              // 文字区原文；新一轮开始是 ''
const mood  = useZoneText('status', '心情')                          // 数据区的一行
const face  = useZoneData('face', { hold: true, complete: true })   // 数据区整块（{ 表情: 'happy' }）
const items = useZoneList('action')                                 // 选项区每一条
const z     = useZone('face', opts)                                 // 原始的区（{ type, value }）
const id    = useWritingZone()                                      // AI 正在写哪个区；没在生成＝null
const p     = useTurnProgress()                                     // { zone, label, ratio }；没在生成＝null
```

| 选项 | 意思 | 用在 |
|---|---|---|
| `hold: true` | 这一轮还没写到这个区时，用最近一次写过的值（不消失） | 表情、场景、状态这类「一直该有个值」的区 |
| `complete: true` | 这个区写完（出现结束标签）才换，不给写到一半的半截值 | 同上 |

正文、选项两个都不加。没有值时返回同一个空字符串 / 空对象 / 空数组，不会让组件白重渲染。

### 现成组件

| 组件 | 作用 |
|---|---|
| `<StageToaster />` | SDK 的结果自动弹成顶部提示：读取 / 存档 / 图册 / 结算出错，玩家在面板改了存档。`ops={[...]}` 改要提示哪些操作；自己也能 `toast('抓到啦！', 'ok')` |
| `<SaveIndicator />` | 「正在保存… / ✓ 已保存 / ⚠ 没存上 · 重试」，平时是手动保存按钮。`quiet`：平时不显示，只在存档时冒小图标 |
| `<TurnProgress />` | 「● 正在写 · 表情」+ 进度条；`labels={{ thought: '偷偷想心事中' }}` 换说法 |
| `<Splash />` | 启动加载页（StageBoot 自己用；想单独用也行） |

都只用 `sp-*` 配色变量（见[换肤](#样式与换肤)），`className` 可以整个换掉外观。在 `StageBoot` 里面用不用传 `stage` / `saver`。

## 会话引擎 `@dianziji/stage`

不用 React 也能用会话（React 外壳就是包了它）：

```ts
import { createSession } from '@dianziji/stage'

const snap = await stage.load({ limit: 50 })
const session = createSession({ stage, snapshot: snap, normalize, onTurn })
session.subscribe(() => render(session.getState()))
session.start()                    // 刷新前那一轮还在生成：接着收（返回停止函数）
await session.send('我推开门')
session.dispose()                  // 不用了：停收流、退订
```

它替你做掉的：

| | |
|---|---|
| 发消息 | 点了先显示这句、进入生成中；发失败撤回；同一时间只有一轮 |
| 收流 | 写完自动进历史；断线 / 2 分钟没回应 / 上游出错都会结束这一轮并给 `error` |
| 分区 | 每帧最多解析一次；内容没变的区是同一个对象；记下写完没有、最近写过的值、正在写哪个区 |
| 存档 | `setSave` 本地立刻生效；存档器合并连续改动、同一时间只发一个、关页面 / 切后台用 keepalive 发完；别处（本局面板）存了自动换成新的 |
| 结算 | `onTurn` 在 AI 写完那一刻算一次，结果在 `lastTurn` |

其他工具：

```ts
readZones(原文, snap)          // 原文 → 分区（和网站聊天页同一套；配图编号 ![](17) 换成图）
zoneNum(zones, 'status', '好感变化')   // 安全取值：没写 → null（AI 不一定每轮都写每一行）
zoneText(zones, 'status', '心情')      // 没写 → ''
zoneList(zones, 'action')              // 没写 → []
zoneData(zones, 'face')                // 没写 → {}
renderMarkdown(md)             // markdown → 安全 HTML（原始 HTML 转义、危险链接清空；对白「」包成 <span class="quote">）
createSaver(stage)             // 单独用存档器：save(next) / save(next, { now: true }) / saveNow() / flush()
```

## 客户端 `@dianziji/stage/client`

零依赖，3 个接口 + 1 条流：

```ts
import { createStage } from '@dianziji/stage/client'

const stage = createStage({ api, token })
const snap = await stage.load({ limit: 20 })        // 读这一局（before: 消息 id 往前翻）
const turn = await stage.send('我推开门', {
  onDelta: (text, chunk) => {},  // text＝到目前为止的完整原文
  onDone: (text) => {},
  onFail: (err) => {},           // err: StageError（err.code / err.retryable）
})
turn.close()                                         // 不收了（后台照常生成完）
await turn.finished                                  // 完整原文；失败 reject StageError
if (snap.streaming) stage.resume(snap.streaming, handlers)   // 刷新前那一轮还在生成：接着收（从头回放）

await stage.save({ love: 30 })                       // 整份覆盖；null 清空。后端按存档结构校验
await stage.gallery()                                // 图册（和网站画廊同一套解锁）
stage.siteUrl('/recharge')                           // 网站上的页面（load 之后才有网站地址）
stage.tokenInfo()                                    // { sessionId, model, channel, expiresAt, dev, … }
stage.on((e) => {})                                  // 所有保存、所有失败都广播（见下）
```

**从平台进入**：`readLaunch()` 读平台放在舞台地址 `#api=…&token=…` 里的连接，读完从地址栏擦掉（`#` 后面别的内容留着）；没有＝`null`。平台签的 token 6 小时有效，过期报 `unauthorized`，玩家刷新就会重签。没有连接时 `createStage` 不发请求，直接报 `unauthorized`「请从电子姬网站进入这张卡」。

**事件**：`stage.on` 收到

- `{ type: 'save', state, source }`：存好了。`source`：`saver` 自动存 / `manual` 手动存 / `panel` 玩家在本局面板改的 / `app` 直接调 `stage.save`。
- `{ type: 'error', op, error }`：某个操作失败。`op`：`load` / `send` / `stream` / `save` / `gallery` / `turn`。

游戏不用管存档是谁改的，订阅一次就能跟着更新界面（会话引擎已经替你订阅了）。

## 附给 AI 的「此刻状态」

存档 AI 看不到。想让它知道当前数值，发话时自己附上（附不附、附什么由舞台决定，SDK 不会自动加）：

```ts
send(withState('我们去公园吧', { 好感: 42, 地点: '主人的房间' }))
splitState(原文).text     // 显示玩家的话时把状态块藏掉
```

`<dj_state>` 是平台约定的标签：发给 AI 时历史里旧的整块删掉、只留最新一份并去掉标签（不会越聊越长）；网站聊天页、记忆摘要、搜索都会藏掉它；里面的内容照常参与世界书扫描。**每次带一份完整的**，没带的就当没有了。

## 出错

所有失败都是 `StageError`：`message` 是给玩家看的中文，`code` 给程序判断，`retryable`＝原样再试有没有意义。

| code | 什么时候 | 建议给玩家 |
|---|---|---|
| `insufficient` | 能量不足 | 「去充值」→ `stage.siteUrl('/recharge')` |
| `network` | 发不出去 / 流断了 / 2 分钟没回应 | 「再说一次」 |
| `stream` | 上游模型出错（不扣费） | 「再说一次」 |
| `busy` | 上一轮还没完 | 等一下 |
| `rate_limited` | 太频繁（`err.retryAfter` 秒后再试） | 倒计时 |
| `invalid` / `too_large` | 存档不符合存档结构 / 太大 | 显示 `message`（写明了哪里不对） |
| `maintenance` | 平台维护 | 显示 `message` |
| `unauthorized` | token 过期 / 这一局被删 / 卡下架 | 重新进入 |

会话引擎里：`error.retry` 有值就给「再说一次」按钮（`retry()`）。完整做法见例子的 `src/game/ErrorNotice.tsx`。

## 样式与换肤

`@dianziji/stage/styles.css` 带了 SDK 组件（加载页、提示、保存按钮、进度）和本局面板共用的配色变量。换肤：在自己的样式里覆盖（写在 import 后面）：

```css
:root {
  --color-sp-accent: #ec4899;
  --color-sp-bg: #fff8f1;
}
```

全部变量和深色写法见 [`@dianziji/stage-panel` 的 README](../stage-panel/README.md#换肤)。

## 手机：安全区和键盘

```ts
import { watchViewport } from '@dianziji/stage'
watchViewport()   // 启动时调一次
```

它在 `<html>` 上维护 5 个 CSS 变量（px）：`--safe-top / --safe-right / --safe-bottom / --safe-left`（刘海、home 条）和 `--kb`（软键盘挡住了多少）。

- 本地开发（舞台是顶层页面）：安全区读系统 `env(safe-area-inset-*)`，键盘用 `visualViewport` 算（只在输入框聚焦时；电脑恒 0）。
- 线上（舞台在平台 iframe 里，`env()` 恒为 0）：由平台量好推进来，只认父窗口的消息。

变量的默认值和 `pt-safe` / `pb-safe` / `px-safe` / `pb-composer` 这几个工具类在例子的 `src/index.css` 里，新项目照抄过去。**让位的是内容不是容器**：背景铺满到屏幕边，只用 padding 把按钮、输入框顶开。

## 测试

```bash
npm test            # 在本包目录；或在例子根目录 npm run test:sdk
npm run test:watch
```

- `test/` 和 `src/` 一一对应：`src/client/stage.ts` ↔ `test/client/stage.test.ts`。新加模块不写测试，`test/layers.test.ts` 会失败。
- 带覆盖率跑，有门槛（行 98 / 语句 95 / 函数 95 / 分支 88），低了就失败。
- 默认 node 环境；要 DOM 的测试文件开头写 `// @vitest-environment jsdom`。React 层用 Testing Library 真实渲染，按区订阅的重渲染次数用 React 的 `Profiler` 断言。
