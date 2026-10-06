# 舞台 HTTP 接口

舞台是一个网页，在一局已经开好的游戏里往下玩：读历史、发一句话、看回复一个字一个字出来、存自己的游戏数据。进场前的事（进场页、初始设定、开场、模型和线路）都由平台处理；世界书、记忆、计费和网站上聊天是同一条链路。

> 用官方例子开发时不用直接调这些接口：SDK（[sdk-client.md](sdk-client.md)）已经全部包好了。这一篇是给想了解底层、或不用我们 SDK 的人看的。

- [接口地址与鉴权](#接口地址与鉴权)
- [GET /stage · 读这一局](#get-stage--读这一局)
- [POST /stage/messages · 发一句话](#post-stagemessages--发一句话)
- [GET {stream_url} · 收流](#get-stream_url--收流)
- [PUT /stage/save · 存档](#put-stagesave--存档)
- [PUT /stage/schema · 改存档结构](#put-stageschema--改存档结构)
- [GET /stage/gallery · 图册](#get-stagegallery--图册)
- [限流](#限流)
- [错误](#错误)

## 接口地址与鉴权

```
https://api.<网站域名>/api/v1/stage
```

每个请求带上请求头（收流除外）：

```
Authorization: Bearer st_你的凭证
```

一个凭证（token）代表**一个人的一局游戏**：只能操作这一局，碰不到账户、钱包和别的会话。它和开放平台生图用的 API Key 是两回事，不能混用。

| 从哪来 | 有效期 | 说明 |
|---|---|---|
| 线上 | 6 小时 | 玩家每次进入舞台，平台签一个新的，放在舞台地址 `#api=…&token=…` 里交给舞台（SDK 的 `readLaunch()` 读）。过期了玩家刷新页面就会重签 |
| 本地开发 | 7 天 | 网站上进入自己的卡、走完开场，工具行「开发」→ 生成凭证，复制进 `.env` |

凭证能在这一局里聊天、花你的能量：不要外传、不要提交到 Git。泄露了就在网站上删掉这一局会话，凭证立刻失效。

所有接口都支持跨域。

## GET /stage · 读这一局

舞台启动、页面刷新时调一次，把这一局恢复出来。

**参数**（都可选，放在 URL 上）

| 参数 | 说明 |
|---|---|
| `limit` | 要几条历史，默认 20，最多 100 |
| `before` | 消息 id：取这条之前的一页（往前翻历史） |

```bash
curl "https://api.<网站域名>/api/v1/stage?limit=20" -H "Authorization: Bearer st_你的凭证"
```

**返回**

```jsonc
{
  "card": { "id": "ca44070d", "name": "电子姬的同居日常" },
  "site": "https://dianziji.ai",                 // 玩家所在网站，拼站内链接用
  "dev": false,                                   // 是不是开发凭证
  "user": { "id": 7, "username": "linchuan", "name": "林川", "avatar": "https://…" },
  "asset_base": "https://…",                      // 卡素材图床地址
  "slots": [{ "zone": "narrative", "kind": "markdown", "label": "正文" }],
  "state_schema": { "type": "object", "properties": { … } },
  "image_pack": { "groups": [{ "name": "日常", "rounds": 0 }], "images": [{ "n": 1, "src": "https://…", "g": ["日常"] }] },
  "setup": {
    "text": "名字：林川\n称呼：前辈",
    "fields": [{ "key": "user", "label": "名字", "value": "林川" }, { "key": "call", "label": "称呼", "value": "前辈" }]
  },
  "history": [
    { "id": 1201, "role": "assistant", "kind": "opening", "content": "开场原文……", "created_at": "…", "status": "ok", "spend": null },
    { "id": 1202, "role": "user", "kind": null, "content": "我推开门", "created_at": "…", "status": "ok", "spend": null },
    { "id": 1203, "role": "assistant", "kind": null, "content": "<narrative>…</narrative>", "created_at": "2026-10-06T14:30:12+08:00", "status": "ok",
      "spend": { "cost": 312, "model": "deepseek/deepseek-v3.2", "channel": "…", "out_tokens": 640, "in_tokens": 5820, "in_cost": 210, "out_cost": 102 } }
  ],
  "has_more": false,
  "save": { "love": 20 },
  "streaming": null
}
```

| 字段 | 说明 |
|---|---|
| `card` | 卡的 id 和名字 |
| `site` | 玩家所在网站的地址（签凭证时所在的域名）。拼「去充值」「在网站打开这一局」这类链接用；SDK 的 `stage.siteUrl()` 就是用它 |
| `dev` | 是不是开发凭证（编辑器「开发」签的）。本局面板据此多出凭证细节；玩家的凭证是 `false` |
| `user` | 玩家的公开资料：`id`、`username` 用户名、`name` 昵称、`avatar` 头像地址。只有这几项（不给邮箱、余额），每次读取都是最新的 |
| `asset_base` | 卡素材的图床地址。卡数据里写的 `{{asset}}/卡id/assets/…`，把 `{{asset}}` 换成它就是完整地址；`image_pack` 里的图已经换好了 |
| `slots` | 卡的分区结构：`zone` 区 id、`kind` 类型、`label` 显示名，其余字段原样透传。回复里的 `<区id>…</区id>` 只有在这里注册过的才算分区。类型只看两样：`kind` 是 `yaml` / `data` 的是数据区，**区 id 是 `action` 的是选项区**（选项区的 id 必须叫 `action`），其余都是文字区 |
| `state_schema` | 存档结构（JSON Schema，编辑器「舞台」页定义）。没定义时是 `null`，此时不能存档。见 [state.md](state.md) |
| `image_pack` | 配图库：`images` 是图表（`n` 编号、`src` 地址、`g` 所属分组），`groups` 是分组（`rounds`＝第几轮解锁，做图册用）。AI 在回复里用编号引用图（写法由卡的分区说明定，比如 `![](3)` 或在专门的区里只写 `3`）。没配时是 `null`。SDK 的 `readZones` 不会把编号换成地址，用 `imageUrl(snap, 编号)` 取，见 [sdk-session.md](sdk-session.md#配图编号) |
| `setup` | 初始设定（玩家进场前在平台填的，只读）。`text` 是原文，和 AI 看到的一字不差；`fields` 按卡的设定字段拆好，按 `key` 取值，没填的 `value` 是 `null`。要改请回平台的设定弹窗 |
| `history` | 历史，正序（最新的在最后） |
| `history[].kind` | `opening` 平台写入的开场；`lead` 幕启（AI 开场的卡，平台在开场前替玩家说的那段引子）；`null` 正常对话 |
| `history[].content` | 原文，怎么显示由你决定 |
| `history[].status` | `ok` 正常；`error` 是断流（正文只写了半截，照样扣费）或生成失败（正文为空，没扣费） |
| `history[].spend` | 这一轮的消耗，和聊天页「本轮消耗」同一套数：`cost` 总能量、`model` 模型、`channel` 线路、`out_tokens` 输出 token；`in_tokens` / `in_cost` / `out_cost` 是输入 token 和输入、输出各花多少能量，老消息查不到时是 `null`。只有扣了能量的 AI 回复才有，其余是 `null` |
| `has_more` | 更早还有历史：用 `before=最早那条的 id` 再取 |
| `save` | 当前存档。没存过、或不符合卡现在的存档结构（作者改过结构），给的是开局存档；卡没定义存档结构时是 `null` |
| `streaming` | 不为空（`{ turn_id, stream_url }`）＝刷新前那一轮还在生成：直接连 `stream_url`，会从头回放再接着往下收 |

## POST /stage/messages · 发一句话

玩家说一句话，开始新的一轮。只收 `text`；卡、设定、开场、模型、线路都由平台从这一局里取，传别的字段会被忽略。

| 参数（JSON） | 说明 |
|---|---|
| `text` | 必填，玩家说的话 |

```bash
curl -X POST "https://api.<网站域名>/api/v1/stage/messages" \
  -H "Authorization: Bearer st_你的凭证" \
  -H "Content-Type: application/json" \
  -d '{"text": "我推开门走进去"}'
```

**返回**

```json
{ "turn_id": "n3-5f1c…", "stream_url": "https://stream.…/stream?gen=…&token=…" }
```

- 返回时玩家这句话已经写进历史。失败（能量不足、正在生成等）不会写进历史。
- 上一轮还没完就再发会得到 `busy`；刚收到 `done` 的那一瞬间平台可能还在收尾，也可能得到 `busy`，隔一秒重试即可。
- 想让 AI 知道当前数值（好感、地点…），把它们包在 `<dj_state>` 里接在这句话末尾，见 [state.md](state.md#附给-ai-的此刻状态)。

## GET {stream_url} · 收流

用浏览器自带的 `EventSource` 直接连，**不用带凭证**（地址里自带一次性票据）。

```js
const es = new EventSource(stream_url)
let text = ''
es.onmessage = (e) => {
  const d = JSON.parse(e.data)
  if (d.c) text += d.c // 正文增量，拼起来就是完整回复
}
es.addEventListener('done', () => es.close())
es.addEventListener('fail', (e) => { es.close(); console.log(JSON.parse(e.data).message) })
```

| 事件 | 数据 | 说明 |
|---|---|---|
| `message` | `{"c":"…"}` 或 `{"r":"…"}` | 正文增量 / 思维链增量 |
| `done` | — | 这一轮完成 |
| `fail` | `{"message":"…"}` | 这一轮失败，不扣费 |

- 首次连接从头回放，刷新后重连也能拿到完整内容。
- ★网络断了 `EventSource` 会**无限自动重连、永远不报错**：要自己判断（连续几次连不上、或很久没收到字就结束这一轮），否则界面会一直卡在「生成中」。SDK 已经处理了：连续 3 次连接错误或 2 分钟没收到字就报 `network`。
- 收到 `done` 后直接用流里拼出来的原文，不要马上调「读这一局」去刷新：平台入库有一小段延迟。

## PUT /stage/save · 存档

存舞台自己的游戏数据：血量、背包、地图、小游戏进度。请求体就是存档本身，**整份覆盖**旧的；传 `null` 清空（之后读到的是开局存档）。

```bash
curl -X PUT "https://api.<网站域名>/api/v1/stage/save" \
  -H "Authorization: Bearer st_你的凭证" \
  -H "Content-Type: application/json" \
  -d '{"hp": 80, "scene": "教室", "items": ["钥匙"]}'
```

**返回**：`{ "ok": true, "size": 45 }`（`size`＝存进去的字节数）

- 必须是 JSON 对象，最大 64KB。
- 必须符合卡的存档结构：字段、类型、取值范围不对就存不进去（`invalid`，`message` 写明哪里不对）。卡没定义存档结构时不能存档。见 [state.md](state.md)。
- AI 看不到存档。想让 AI 知道的，写进发出去的那句话里。
- 生成中也可以存，互不影响。

## PUT /stage/schema · 改存档结构

改这张卡的存档结构（游戏状态，JSON Schema）。请求体就是结构本身；传 `null` 去掉（之后不能存档）。

★**只认开发凭证**（编辑器「开发」签的），而且凭证的主人必须是**这张卡的作者**（或管理员）。玩家进游戏的凭证一律返回 `unauthorized`：不然玩家能改作者的卡。

```bash
curl -X PUT "https://api.<网站域名>/api/v1/stage/schema" \
  -H "Authorization: Bearer st_你的开发凭证" \
  -H "Content-Type: application/json" \
  -d '{"type":"object","properties":{"love":{"type":"integer","minimum":0,"maximum":100,"default":20}},"additionalProperties":false}'
```

**返回**：`{ "ok": true, "state_schema": { … } }`

- 校验和网站编辑器保存时同一套：根节点必须是 `"type": "object"`，开局存档（各字段的 `default`）必须通过它。不合格返回 `invalid`，`message` 写明原因，卡不会被改。
- 最大 64KB。`{}` 原样保存（不会变成 `[]`）。
- 改了结构，通不过新结构的老存档读回来是开局存档：**改之前先告诉作者**。
- 官方例子的用法：结构放在 `src/game/state.schema.json`，`npm run schema:push` 推上去（见 [state.md](state.md#存档结构)）。

## GET /stage/gallery · 图册

这张卡的图册，和网站画廊同一套规则：玩家在这张卡**所有会话累计**的 AI 回复数就是轮数（开场、生成失败不算），配图库的每个相册按作者设的轮数解锁。锁着的相册只有名字、张数和门槛，不给图片地址。

单独一个接口，做图册页时再调；「读这一局」不带它。

```json
{
  "turns": 12,
  "previews": [{ "src": "https://…", "thumb": "https://…" }],
  "packs": [
    { "name": "日常", "state": "open", "rounds": 0, "count": 8, "cover": "https://…",
      "images": [{ "src": "https://…原图", "thumb": "https://…缩略图" }] },
    { "name": "告白", "state": "locked", "rounds": 30, "count": 2, "cover": null, "images": [] },
    { "name": "番外", "state": "hidden", "rounds": -1, "count": 5, "cover": null, "images": [] }
  ]
}
```

| 字段 | 说明 |
|---|---|
| `turns` | 已玩轮数（这张卡所有会话累计） |
| `previews` | 卡的门面图，谁都能看 |
| `packs[].state` | `open` 已解锁；`locked` 还没玩到轮数（还差 `rounds − turns` 轮）；`hidden` 作者没开放 |
| `packs[].rounds` | `-1` 不公开；`0` 一直开放；`N` 玩到第 N 轮解锁 |
| `thumb` / `src` | 缩略图（只取第一帧，做格子用）/ 原图（点开看） |

## 限流

- 每人每分钟 60 次（读、发、存合计），超了返回 `rate_limited`，按响应头 `Retry-After` 的秒数等待。
- 发消息另外受聊天的限流；上一轮没完再发是 `busy`。

## 错误

失败时都返回同一种格式。`message` 是给玩家看的中文，可以直接显示；`code` 给程序判断。

```json
{ "error": { "code": "busy", "message": "上一条还在生成中，请稍候" } }
```

全部错误码和该给玩家什么见 [errors.md](errors.md)。
