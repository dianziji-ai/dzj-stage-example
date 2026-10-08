# 客户端 `@dianziji/stage/client`

## 分三层

上层只依赖下层（`packages/stage/test/layers.test.ts` 守着）。用哪层从哪层引：

| 入口 | 是什么 | 什么时候用 |
|---|---|---|
| `@dianziji/stage/react` | **React 外壳**：`StageBoot`、`useStage`、`useZone…`、`StageToaster`、`SaveIndicator`、`TurnProgress` | 用 React 写舞台（推荐） |
| `@dianziji/stage` | **会话引擎**：`createSession`（乐观发送、重试、分区追踪、结算）、`createSaver`、`readZones`、`renderMarkdown`、`applySafeArea`。客户端的东西这里也全都能引到 | 不用 React 但想要现成的会话 |
| `@dianziji/stage/client` | **客户端**：`createStage`（和外层网站之间的桥）、`StageError`、`withState`、全部数据类型。**零依赖** | 状态自己管（Vue、原生 JS、别的框架） |

```
src/client/   客户端（零依赖）          ← test/client/
src/session/  会话引擎、存档器、分区     ← test/session/
src/view/     markdown、安全区           ← test/view/
src/react/    React 外壳                ← test/react/
```

## 用法

零依赖：舞台不连后端、没有凭证，和外层网站之间只靠一座桥（postMessage，协议见 [bridge.md](bridge.md)）。网站把这一局的快照推进来，舞台有事请网站去做：

```ts
import { createStage } from '@dianziji/stage/client'

const stage = createStage()                          // 不要参数；一个舞台只建一个（例子放在 src/stage.ts）
const snap = await stage.ready()                     // 等网站给第一份快照；3 秒没等到（不在网站里）→ StageError('unauthorized')
stage.snapshot()                                     // 现在的快照（本地镜像，不走网络）；还没连上＝null
const off = stage.subscribe((snap, changed) => {})   // 网站推来的变化：snap＝最新整份，changed＝这次变了哪几项（init 时是全部）

await stage.send('我推开门')                          // 发一句话。开始生成了就 resolve（不等写完）；没发出去（能量不够…）就 reject；之后看快照的 live / history / error
await stage.stop()                                   // 停止生成（已经写出来的字保留）
await stage.regenerate()                             // 重新生成最后一条 AI 回复（消耗能量）
await stage.older()                                  // 读更早的历史：读到的随快照的 history 推过来

await stage.save({ love: 30 })                       // 整份覆盖；null 清空。网站按存档结构校验。回 { size }
await stage.gallery()                                // 图册（和网站画廊同一套解锁）
stage.siteUrl('/recharge')                           // 网站上的页面（连上之前只给路径本身）
stage.on((e) => {})                                  // 所有保存、所有失败都广播（见下）
stage.dispose()                                      // 不用了：摘掉监听、拒掉还没回的请求
```

- 每个请求 15 秒没回应 → `StageError('network')`；失败一律抛 `StageError`（`err.code` / `err.retryable` / `err.retryAfter`），同时广播一次 `{ type: 'error' }`。
- `send` 的 `text` 原样发出去，SDK 不往里加任何东西；想让 AI 知道「此刻状态」先用 `withState(话, 状态)` 拼好（见 [state.md](state.md#附给-ai-的此刻状态)）。
- 生成中、写完、失败都在快照里：`live`（`{ said, text, reasoning }`，没在生成＝`null`）、`history`、`error`。一轮从 `live` 有值开始、`live` 变回 `null` 结束，谁发起的都一样（舞台、网站输入框、重生）。快照字段全表见 [bridge.md](bridge.md#快照字段)。
- `stage.report(op, error)`：SDK 之外的代码（会话、组件）也走同一条失败广播（会话引擎用它报 `onTurn` 出错）。

### 打开网站工具 `stage.open(tool)`

舞台不用自己做换模型、挂 MOD、本局设定这些面板：点一下交给网站。

```ts
stage.open('model')    // 换模型 / 调参数
stage.open('mod')      // 挂 MOD
stage.open('session')  // 本局：设定、存档、图册、消费记录
stage.open('memory')   // 记忆
stage.open('chat')     // 切到对话模式（改 / 删 / 回溯记录在那里做）
```

只在连上网站之后有效（返回 true）；单独打开 localhost 时没有外层网站，什么都不发生（返回 false）。React 里从 `useStageActions().stage` 拿。

**事件**：`stage.on` 收到

- `{ type: 'save', state, source }`：存好了。`source`：`saver` 自动存 / `manual` 手动存 / `panel` 玩家在本局面板改的 / `app` 直接调 `stage.save`。
- `{ type: 'error', op, error }`：某个操作失败。`op`：`send` / `stop` / `regenerate` / `older` / `save` / `gallery` / `open`（请网站做的那几件），或 `turn`（游戏规则 `onTurn` 出错）。

游戏不用管存档是谁改的，订阅一次就能跟着更新界面（会话引擎已经替你订阅了）。
