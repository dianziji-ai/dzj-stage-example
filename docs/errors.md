# 错误码

所有失败都是同一种格式。`message` 是给玩家看的中文，可以直接显示；`code` 给程序判断。

```json
{ "error": { "code": "busy", "message": "上一条还在生成中，请稍候" } }
```

用 SDK 时，失败一律抛 `StageError`：`err.code`、`err.message`、`err.status`（HTTP 状态码），`err.retryable`＝原样再试有没有意义，`err.retryAfter`＝`rate_limited` 时要等的秒数。

| code | HTTP | 什么时候 | 建议给玩家 | retryable |
|---|---|---|---|---|
| `unauthorized` | 401 / 403 / 404；没拿到凭证时 0 | 凭证无效或过期、这一局被删、卡不在了；**没拿到凭证**（线上没从平台进入）| 「回到网站重新进入这张卡」；本地开发：重新生成凭证贴进 `.env` | 否 |
| `insufficient` | 402 | 能量不足 | 「去充值」→ `stage.siteUrl('/recharge')` | 否 |
| `invalid` | 422 | 话为空、存档不符合存档结构、卡没定义存档结构、模型或线路已不可用 | 显示 `message`（写明了哪里不对） | 否 |
| `too_large` | 413 | 存档超过 64KB | 显示 `message` | 否 |
| `busy` | 429 | 上一轮还没完，或玩家在别处正在生成 | 等这一轮结束再发 | 是 |
| `rate_limited` | 429 | 太频繁（每人每分钟 60 次） | 倒计时 `err.retryAfter` 秒 | 是 |
| `maintenance` | 503 | 聊天维护中或服务繁忙 | 显示 `message`，稍后重试 | 是 |
| `network` | — | 发不出去 / 流断了 / 2 分钟没收到字（SDK 自己判断，不会一直卡在「生成中」）| 「再说一次」 | 是 |
| `stream` | — | 上游模型出错（这一轮不扣费） | 「再说一次」 | 是 |
| `error` | 其他 | 其他服务器错误 | 显示 `message` | 是 |

`busy` 和 `rate_limited` 都是 429，用 `code` 区分。

★`err.retryable` 和会话里的「再说一次」（`state.error.retry`）**不是一回事**：`retryable` 只说「原样再试有没有意义」；会话只在 `network` / `stream` / `error` 时给 `retry`（`busy`、`rate_limited`、`maintenance` 要等一会儿，不给「再说一次」按钮）。画「再说一次」按钮看 `state.error.retry` 有没有值。

## 会话引擎里

用 `StageBoot` / `createSession` 时：

- 发话失败、流失败都放在 `state.error`：`{ error: StageError, retry?: string }`。`retry` 有值就给「再说一次」按钮，调 `retry()` 原样再发。
- 读取 / 存档 / 图册 / 结算（`onTurn`）出错由 `<StageToaster />` 自动弹顶部提示；发消息的错误不弹（游戏自己在对话框里讲）。
- 启动时读不到这一局：`StageBoot` 的加载页直接显示原因 + 重试，不白屏。

完整做法见官方例子 `src/game/ErrorNotice.tsx`。
