# 错误码

所有失败都是同一种格式。`message` 是给玩家看的中文，可以直接显示；`code` 给程序判断。失败有两个来源，用的是同一套 `code`（桥上的格式见 [bridge.md](bridge.md#出错)）：

- **请求失败**：舞台请网站做的事（发一句话、存档、图册…）网站没做成，`response` 里回 `{ ok: false, error: { code, message, retryAfter? } }`。
- **这一轮失败**：话已经发出去了，生成的时候出错，网站在快照的 `error` 里推 `{ code, message, retry?, retryAfter? }`。

用 SDK 时，失败一律抛 `StageError`：`err.code`、`err.message`，`err.retryable`＝原样再试有没有意义，`err.retryAfter`＝`rate_limited` 时要等的秒数。

| code | 什么时候 | 建议给玩家 | retryable |
|---|---|---|---|
| `unauthorized` | **不在网站里打开**（3 秒没收到网站的快照，比如直接打开了 localhost）；还没连上网站就发了请求 | 「回到网站重新进入这张卡」；本地开发：别直接打开 localhost，在网站里打开（工具行「开发」→ 本地开发） | 否 |
| `insufficient` | 能量不足 | 「去充值」→ `stage.siteUrl('/recharge')` | 否 |
| `invalid` | 话为空、存档不符合存档结构、卡没定义存档结构、模型或线路已不可用 | 显示 `message`（写明了哪里不对） | 否 |
| `too_large` | 存档超过 64KB | 显示 `message` | 否 |
| `busy` | 上一轮还没完，或玩家在别处正在生成 | 等这一轮结束再发 | 是 |
| `rate_limited` | 太频繁 | 倒计时 `err.retryAfter` 秒 | 是 |
| `maintenance` | 聊天维护中或服务繁忙 | 显示 `message`，稍后重试 | 是 |
| `network` | 网站 15 秒没回应（SDK 自己判断，不会一直等）；舞台已关闭；连接断了 | 「再说一次」 | 是 |
| `stream` | 上游模型出错（这一轮不扣费） | 「再说一次」 | 是 |
| `error` | 其他错误 | 显示 `message` | 是 |
| `version` | 网站和舞台的桥协议版本对不上 | 「这个舞台需要作者更新」 | 否 |

★`err.retryable` 和会话里的「再说一次」（`state.error.retry`）**不是一回事**：`retryable` 只说「原样再试有没有意义」；会话只在 `network` / `stream` / `error` 时给 `retry`（`busy`、`rate_limited`、`maintenance` 要等一会儿，不给「再说一次」按钮）。网站在 `error.retry` 里给了那句原话时以它为准。画「再说一次」按钮看 `state.error.retry` 有没有值。

## 会话引擎里

用 `StageBoot` / `createSession` 时：

- 发话失败、这一轮失败都放在 `state.error`：`{ error: StageError, retry?: string }`。`retry` 有值就给「再说一次」按钮，调 `retry()` 原样再发。
- 读更早的 / 存档 / 图册 / 结算（`onTurn`）出错由 `<StageToaster />` 自动弹顶部提示；发消息的错误不弹（游戏自己在对话框里讲）。
- 启动时连不上网站：`StageBoot` 的加载页直接显示原因 + 重试，不白屏。

完整做法见官方例子 `src/game/ErrorNotice.tsx`。
