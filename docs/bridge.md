# 舞台桥（postMessage 协议）

舞台是网站页面里的一个 iframe。**网站把这一局的状态（快照）推给舞台，舞台有事就请网站去做。** 舞台不连后端、没有凭证、不调任何接口：聊天、生成、计费、换模型、MOD、记忆、回溯、重生、存档落库，全是网站现成的那一套。在网站输入框发的话、在对话模式里回溯 / 编辑 / 删除、换了模型，舞台都会立刻跟上，因为网站推来的就是「现在是什么样」。

> 用官方 SDK 开发时不用自己处理这些消息：`createStage()`（[sdk-client.md](sdk-client.md)）已经全部包好了。这一篇写给想了解底层的作者，和实现网站那一侧的人。代码里的定义在 `packages/stage/src/client/protocol.ts`（消息）、`types.ts`（快照）。

```
┌──────────────────── 网站页面 ─────────────────────┐
│  聊天（发消息 / 流式 / 回溯 / 重生 / 计费…）        │
│        │ init / update（快照）     ▲ request        │
│        ▼                           │                │
│  ┌──────────── 舞台 iframe ─────────┴──┐            │
│  │ SDK：镜像快照 → 会话 → hooks → 画面 │ ◄─ response │
│  └─────────────────────────────────────┘            │
└─────────────────────────────────────────────────────┘
```

## 5 种消息

每条消息都带同一个信封：`{ dzj: 'stage', v: 1, type: … }`。`dzj` 不是 `'stage'` 的消息两边都不理（页面里别的 postMessage 不受影响）。

| 方向 | `type` | 内容 | 什么时候 |
|---|---|---|---|
| 舞台 → 网站 | `ready` | `{ sdk: '0.3.0' }` | 舞台加载完、开始等快照（`stage.ready()`）。没收到 `init` 之前每 400ms 重发一次（网站可能还没开始听） |
| 网站 → 舞台 | `init` | `{ snapshot }`：整份快照 | 收到 `ready`；换局、读档后也可以再发一份整的 |
| 网站 → 舞台 | `update` | `{ patch }`：快照里**变了的那几项** | 任何变化（生成中每次长字都可以推，网站可以自己节流） |
| 舞台 → 网站 | `request` | `{ id, method, args? }` | 舞台请网站做事（见下面「7 个请求」）。`id` 由舞台生成（`r1`、`r2`…） |
| 网站 → 舞台 | `response` | `{ id, ok: true, data? }` 或 `{ id, ok: false, error: { code, message, retryAfter? } }` | 回对应 `id` 的 `request` |

就这些。没有「开始 / 增量 / 完成」一堆事件：网站只推「现在是什么样」，SDK 自己比较前后两份，知道一轮什么时候开始、什么时候写完。

- 舞台 3 秒内没收到 `init`：`stage.ready()` 失败（`unauthorized`「请在电子姬网站里打开这张卡」）。直接打开 `localhost` 就是这样。
- 一个 `request` 15 秒没收到 `response`：失败（`network`「网站没有回应，稍后再试」）。
- `update` 在 `init` 之前到的不算；`patch` 是空对象也不算。

## 快照字段

`init` 给整份，`update` 只给变了的那几项（整项替换，不做深合并：比如 `history` 变了就给完整的新 `history`）。类型见 `StageSnapshot`（`packages/stage/src/client/types.ts`）。

| 字段 | 说明 | 什么时候变 |
|---|---|---|
| `card` | `{ id, name, avatar, background, menu_background }`：卡名、封面、对话背景、菜单背景（没配＝`''`） | 不变 |
| `site` | 网站地址（如 `https://dianziji.ai`），`stage.siteUrl('/recharge')` 拼站内链接用 | 不变 |
| `user` | 玩家的公开资料 `{ id, username, name, avatar }`；只有这几项 | 不变 |
| `asset_base` | 卡素材的图床地址：卡里写的 `{{asset}}/卡id/assets/…` 把 `{{asset}}` 换成它 | 不变 |
| `slots` | 卡的分区结构 `{ zone, kind?, label?, … }`，其余字段原样透传 | 不变 |
| `state_schema` | 存档结构（JSON Schema，编辑器「舞台 → ② 存档结构」）；没定义＝`null`，此时不能存档 | 不变 |
| `image_pack` | 配图库 `{ groups, images }`（AI 按编号引用的图）；没配＝`null` | 不变 |
| `setup` | 初始设定 `{ text, fields: [{ key, label, value }] }`：玩家填了什么就是什么，只读；没填＝`null` | 玩家在网站上改了设定 |
| `shortcuts` | 卡上的快捷指令 `[{ label, command, mode }]`：`mode`＝`fill` 填进输入框等玩家改（缺省）/ `send` 直接发；没配＝`[]` | 不变 |
| `bgm` | 卡上的背景音乐曲库 `[{ name, url }]`，第一首＝默认播的那首；没配＝`[]` | 不变 |
| `characters` | 卡上的角色包 `[{ names, image, desc, voice }]`：名字和别名、立绘、作者写的简介；`voice`（0.4.0）＝作者给这个角色配了声音（`stage.speak` 能念）；没配＝`[]` | 不变 |
| `history` | 最近的历史（正序，库里原文，`{{asset}}` 已展开）。每条 `{ id, role, kind, content, created_at?, status?, spend? }` | 发出一句、这一轮写完、回溯、编辑、删除、重生、读更早的（`older`） |
| `has_more` | 更早还有历史 | 同上 |
| `save` | 舞台存档；没存过 / 不符合现在的存档结构＝开局存档；卡没定义存档结构＝`null` | **只在 `init` 里给**：之后只有舞台自己存（`save` 请求），网站不再推 |
| `live` | 正在生成的这一轮 `{ said, text, reasoning }`：`said`＝玩家说的那句（已去掉 `<dj_state>`），`text`＝到目前为止的原文，`reasoning`＝思维链；没在生成＝`null` | 一轮开始、生成中每次长字、这一轮结束（变回 `null`）。谁发起的都一样：舞台、网站输入框、快捷指令、重生 |
| `error` | 上一轮失败 `{ code, message, retry?, retryAfter? }`：`retry`＝能「再说一次」的那句原话；没有＝`null` | 这一轮失败时给；玩家再发一句时网站清掉 |
| `meta` | `{ model, channel, dev }`：这一局用的模型、线路（只用来显示，换模型由网站管）；`dev`＝作者本人在本地开发 | 换模型 |
| `safe_area` | `{ top, right, bottom, left }`（px）：刘海、home 条要让开的距离。iframe 里 CSS 的 `env()` 恒为 0，由网站在外层量好推进来 | 转屏、窗口变化 |

### 卡上有的一律从快照读

快捷指令、背景音乐、角色包、封面 / 背景图，**卡上都有**：作者在网站编辑器里配好，网站推进快照。舞台**直接读快照**，别在代码里再写一份——写死的那份作者改了卡也不会变，对话模式和舞台就对不上了。

```ts
const { shortcuts, bgm, characters, card } = stage.snapshot()!
shortcuts.map((s) => <button onClick={() => (s.mode === 'send' ? stage.send(s.command) : fillInput(s.command))}>{s.label}</button>)
const song = bgm.find((t) => t.name.includes('深夜')) ?? bgm[0]   // 按曲名挑，挑不到用第一首
const her = characters.find((c) => c.names.includes('柳月儿'))      // 角色包：立绘、简介
```

卡上**没有**的才写在舞台里：立绘清单、地图热区、玩法规则这些游戏自己的东西。

快照里只会有网站本来就公开给玩家的东西（游玩页能看到的卡数据）；提示词、世界书永远不会进快照。

## 7 个请求

舞台用 `request` 请网站做事，网站用 `response` 回。SDK 上每个方法对应一个请求。

| `method` | `args` | 回的 `data` | 网站怎么做 | SDK |
|---|---|---|---|---|
| `send` | `{ text }` | — | 当成玩家说的一句话发出去（和网站输入框发的一样）。**开始生成了就回（「在生成」的 `live` 已经推到舞台），不等写完**；之后的流式、写完、失败都通过快照的 `live` / `history` / `error` 推过去。没开始就失败了（能量不够这类）＝直接回失败，带错误码。`text` 原样发：要附「此刻状态」，舞台事先用 `withState` 拼进 `text`（见 [state.md](state.md#附给-ai-的此刻状态)） | `stage.send(text)` |
| `stop` | — | — | 停止生成（已经写出来的字保留） | `stage.stop()` |
| `regenerate` | — | — | 重新生成最后一条 AI 回复（消耗能量） | `stage.regenerate()` |
| `older` | — | — | 读更早的一页历史；读到的拼进 `history`，和 `has_more` 一起用 `update` 推过去 | `stage.older()` |
| `save` | `{ state }`（对象，或 `null` 清空） | `{ size }`（存进去的字节数） | 整份覆盖这一局的舞台存档。按卡的存档结构校验（不符合 → `invalid`），最大 64KB（超了 → `too_large`）；卡没定义存档结构 → `invalid` | `stage.save(state)` |
| `gallery` | — | 图册 `{ turns, previews, packs }` | 和网站画廊同一套解锁规则；锁着（`locked`）和没开放（`hidden`）的相册不给图片地址 | `stage.gallery()` |
| `open` | `{ tool }` | — | 打开网站自己的工具：`model` 换模型 / 调参数 · `mod` 挂 MOD · `session` 本局（设定、存档、图册、消费记录）· `memory` 记忆 · `chat` 切到对话模式 | `stage.open(tool)` |
| `speak`（0.4.0） | `{ who, text, emotion }` | `{ url, cost, cached }` | 角色配音：按 `who`（角色名或别名，宏先展开）找作者在角色包里配的声音，用它念 `text`，返回音频地址（舞台自己播）。按字数扣玩家能量，同一句同情绪重听不扣（`cached`）。没配声音 → `no_voice`（不算出错，跳过）；能量不够 → `insufficient`（网站自己弹充值） | `stage.speak(line)`，一般用 [voice.md](voice.md) 的 `useVoice` |

回溯、编辑、删除不开放给舞台：`stage.open('chat')` 切到对话模式去做，做完网站推新的 `history`，舞台自动跟上。

## 一轮什么时候写完

SDK（会话引擎 `createSession`）只看 `live`：

- `live` 从 `null` 变成有值：**一轮开始**（谁发起的都一样）。这一轮的分区清空、回看回到最新。
- `live` 从有值变回 `null`：**这一轮结束**。
  - 同时 `error` 是 `null` → 取 `history` 里最后一条写完的 AI 回复，调作者的 `onTurn` **结算一次**。
  - `error` 有值 → 不结算，按 `error.code` 给「再说一次」。

所以网站那边要做到：

- ★**这一轮结束时，`live: null` 和带上最终那条 AI 回复的 `history` 放在同一个 `update` 里推。** 分两次推，SDK 会拿旧的最后一条去结算。
- 失败时 `live: null` 和 `error` 也放在同一个 `update` 里。
- 回溯 / 编辑 / 删除之后推完整的新 `history`：SDK 整份替换，不结算；舞台正在回看的那条没了就回到最新。
- `init` 时已经写完的轮不结算（玩家不在场时写完的不补算）。`init` 时 `live` 还有值（进来时那一轮还在生成）：SDK 接着显示，等它结束照常结算。

## 出错

失败的 `response` 和快照的 `error` 都用同一套 `code`（`StageErrorCode`）。SDK 一律抛 `StageError`：`message` 是给玩家看的中文，`code` 给程序判断。全部错误码和该给玩家什么见 [errors.md](errors.md)。

| `code` | 意思 |
|---|---|
| `unauthorized` | 不在网站里打开（3 秒没收到 `init`），或还没连上网站就发了请求 |
| `insufficient` | 能量不足 |
| `invalid` | 参数不对：话为空、存档不符合存档结构、卡没定义存档结构… |
| `too_large` | 存档超过 64KB |
| `busy` | 上一轮还没完 |
| `rate_limited` | 太频繁（`retryAfter`＝要等的秒数） |
| `maintenance` | 维护中 / 服务繁忙 |
| `network` | 网站 15 秒没回应、舞台已关闭 |
| `stream` | 上游模型出错 |
| `error` | 其他错误（`response` 没给 `code` 也按它算） |
| `version` | 桥协议版本对不上 |

**版本**：信封里的 `v` 是协议版本（现在是 `1`，`PROTOCOL`）。舞台收到 `v` 不同的消息直接丢掉，控制台报「网站的桥协议是 vX，这个舞台是 v1：请作者更新 SDK」；网站那边用 `version` 回不认识的版本。

## 安全

- **舞台只认外层窗口**：`e.source === window.parent`，而且是桥上的消息（`dzj: 'stage'`）。
- **舞台记住第一份 `init` 的来源**（`e.origin`）：之后只认这个来源的消息，也只往这个来源发。连上之前只发 `ready`，里面只有 SDK 版本号，没有任何数据。
- **网站只认自己那个 iframe**：`e.source === iframe.contentWindow`。
- **iframe 里没有任何凭证**：舞台能做的就是上面 7 件事，每件都由网站以玩家身份去做、按网站的规则校验。舞台放在独立域名，碰不到网站的登录态。

## 不用 React 的舞台

只用客户端（`@dianziji/stage/client`，零依赖），状态自己管：

```ts
import { createStage, StageError, withState, type StageSnapshot } from '@dianziji/stage/client'
import { applySafeArea } from '@dianziji/stage' // 安全区写成 --safe-* 变量（在会话引擎那一层）

const stage = createStage()
const out = document.querySelector<HTMLDivElement>('#out')!
const form = document.querySelector<HTMLFormElement>('#form')!
const input = document.querySelector<HTMLInputElement>('#input')!

let wasLive = false
stage.subscribe((snap, changed) => {
  // init 时 changed 是全部字段
  if (changed.includes('safe_area')) applySafeArea(snap.safe_area)
  if (snap.live) {
    out.textContent = snap.live.text // 生成中：到目前为止的原文
  } else if (wasLive) {
    // 这一轮结束：error 为 null＝写完了，history 里最后一条 AI 回复就是这一轮
    if (snap.error) out.textContent = snap.error.message
    else out.textContent = lastAi(snap)
  } else if (changed.includes('history')) {
    out.textContent = lastAi(snap) // 进来时、回溯 / 编辑 / 删除之后
  }
  wasLive = !!snap.live
})

form.onsubmit = async (e) => {
  e.preventDefault()
  try {
    await stage.send(withState(input.value, { 好感: 42 })) // 开始生成了就返回，不等写完
    input.value = ''
  } catch (err) {
    out.textContent = (err as StageError).message // busy / insufficient …
  }
}

stage.ready().catch((err: StageError) => (out.textContent = err.message)) // 不在网站里：「请在电子姬网站里打开这张卡」

function lastAi(snap: StageSnapshot): string {
  const m = [...snap.history].reverse().find((x) => x.role === 'assistant' && x.status !== 'error')
  return m ? m.content : ''
}
```

显示玩家说过的话时用 `splitState(原文).text` 把 `<dj_state>` 藏掉（同样从 `@dianziji/stage/client` 引）。

想要现成的乐观发送、「再说一次」、分区追踪、存档器、结算：用会话引擎 `createSession`（[sdk-session.md](sdk-session.md)），或 React 外壳（[sdk-react.md](sdk-react.md)）。
