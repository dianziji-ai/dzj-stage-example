# 客户端 `@dianziji/stage/client`

## 分三层

上层只依赖下层（`packages/stage/test/layers.test.ts` 守着）。用哪层从哪层引：

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

## 用法

零依赖：读这一局、发一句话、存档、改存档结构、图册 5 个接口 + 1 条流：

```ts
import { createStage } from '@dianziji/stage/client'

const stage = createStage({ api, token })
const snap = await stage.load({ limit: 20 })        // 读这一局（before: 消息 id 往前翻）
const turn = await stage.send('我推开门', {
  onDelta: (text, chunk) => {},  // text＝到目前为止的完整原文
  onDone: (text) => {},
  onFail: (err) => {},           // err: StageError（err.code / err.retryable）
  onReasoning: (text, chunk) => {}, // 思维链（多数舞台用不到）
})
turn.close()                                         // 不收了（后台照常生成完）。★close 之后 turn.finished 不会再结束，别再 await 它
await turn.finished                                  // 完整原文；失败 reject StageError
if (snap.streaming) stage.resume(snap.streaming, handlers)   // 刷新前那一轮还在生成：接着收（从头回放）

await stage.save({ love: 30 })                       // 整份覆盖；null 清空。后端按存档结构校验
await stage.saveSchema(schema)                       // 改这张卡的存档结构（只认开发凭证 + 卡的作者；null＝去掉）
await stage.gallery()                                // 图册（和网站画廊同一套解锁）
stage.siteUrl('/recharge')                           // 网站上的页面（load 之后才有网站地址）
stage.tokenInfo()                                    // { sessionId, model, channel, expiresAt, dev, … }
stage.on((e) => {})                                  // 所有保存、所有失败都广播（见下）
```

**从平台进入**：`readLaunch()` 读平台放在舞台地址 `#api=…&token=…` 里的连接，读完从地址栏擦掉（`#` 后面别的内容留着）；没有＝`null`。平台签的 token 6 小时有效，过期报 `unauthorized`，玩家刷新就会重签。没有连接时 `createStage` 不发请求，直接报 `unauthorized`「没有拿到进入凭证：请从电子姬网站进入这张卡」（`status` 是 0）。

**事件**：`stage.on` 收到

- `{ type: 'save', state, source }`：存好了。`source`：`saver` 自动存 / `manual` 手动存 / `panel` 玩家在本局面板改的 / `app` 直接调 `stage.save`。
- `{ type: 'error', op, error }`：某个操作失败。`op`：`load` / `send` / `stream` / `save` / `gallery` / `turn`。

游戏不用管存档是谁改的，订阅一次就能跟着更新界面（会话引擎已经替你订阅了）。
