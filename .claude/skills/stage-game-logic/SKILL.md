---
name: stage-game-logic
description: 舞台的游戏逻辑：卡的分区怎么读、onTurn 每轮结算、存档结构（JSON Schema）、normalize、附给 AI 的此刻状态（withState / dj_state）、lastTurn 动效。写结算、存档、发话时用。
---

# 游戏逻辑

详细说明在 `docs/state.md`、`docs/sdk-react.md`、`docs/sdk-session.md`。

## 分区
- AI 的回复按卡的分区写成 `<区id>…</区id>`。`snap.slots` 是卡注册过的分区，**只有注册过的才算**。
- 分区 id 以作者的卡为准（例子用 `scene` / `face` / `narrative` / `thought` / `action`），写代码前先看 `snap.slots`，别照抄例子的 id。
- 三种类型：文字区（正文，markdown）→ `useZoneText(id)`；数据区（`kind: yaml` 或 `data`）→ `useZoneData(id)` / `useZoneText(id, '键')`；选项区 → `useZoneList('action')`。
- ★**选项区的 id 必须叫 `action`**：SDK 只认这个 id 是选项。作者的卡里选项区叫别的名字，`useZoneList` 永远是空数组、也不报错：让作者在网站编辑器「分区」页把它改成 `action`。
- 正文用 SDK 的 `renderMarkdown()` 转成安全 HTML（例子：`Typewriter.tsx`）。

## 每轮结算：onTurn
写在 `src/game/rules.ts`，交给 `<StageBoot onTurn={…}>`。AI 这一轮写完那一刻调一次，返回新存档：

```ts
onTurn: ({ zones, save }) => ({
  ...save,
  love: clamp(save.love + (zoneNum(zones, 'status', '好感变化') ?? 0), 0, 100),
  mood: zoneText(zones, 'status', '心情') || save.mood,
})
```

- ★**一律用安全取值** `zoneNum` / `zoneText` / `zoneList` / `zoneData`：AI 不一定每轮都写每一行，直接 `zones.status.value.好感` 一漏写就崩。
- 数值**夹到范围内**（`clamp`）：AI 写的数不可信，超出存档结构的范围就存不进去。
- 结算逻辑写成纯函数放 `logic.ts`（例子：`nextSave`），用卡的真实回复做测试 fixture。
- 只在 AI 写完那一刻、玩家在场时算一次：生成中刷新会接着收流、写完照样算；**那一轮在页面关着时写完的不补算**。存档和历史允许对不上，别为此写复杂的补算逻辑。
- 抛错不会卡游戏（这一轮存档不变 + 顶部提示），但别依赖它：先把边界情况测掉。

## 存档
- 存档结构在网站编辑器「舞台 → ② 存档结构」（JSON Schema，根节点 `type: object`）。**结构和代码里的存档类型要对上**（例子：`logic.ts` 的 `GameSave`）。
- 开局存档＝结构里各字段的 `default`。
- `normalize`（`rules.ts`）把读回来的存档过一遍：补默认值、丢非法值、旧格式转新格式。玩家在本局面板改了存档也会过一遍。
- 玩家操作改存档用 `setSave(next | fn)`：本地立刻生效，存档器自动合并、自动存。关键时刻 `setSave(x, { now: true })`。
- 最大 64KB。别把历史、长文本塞进存档。
- 卡没定义存档结构时不能存（只改本地）。

## 附给 AI 的此刻状态
存档 AI 看不到。要让 AI 知道当前数值，发话时附上：

```ts
send(withState(玩家的话, stateForAi(save)))   // 例子：useGame.ts 的 send
```

平台怎么处理（详见 `docs/state.md` 的「平台怎么处理它」）：只有**这一轮**那份给 AI 看（去掉标签、接在玩家这句话后面），历史里的旧状态整块删掉；世界书只扫这一轮那份的内容；聊天页、记忆摘要、搜索都藏掉它。

- **用**：存档里的当前数值、玩家在界面里做了 AI 没看见的事、已经发生过别重复的（已解锁的回忆）、想触发的世界书关键词。
- **别用**：写作规则 / 文风 / 格式（写在卡的提示词里）、长期记忆（平台有记忆摘要）、大段数据（每轮都按 token 扣费，控制在几百字以内）。写成事实（「好感: 85」），别写成命令。
- `stateForAi` 返回一个对象，键用中文，**每次带完整的一份**（没带的字段 AI 就当不存在）。
- 显示玩家说过的话时用 `splitState(原文).text` 把状态块藏掉（例子：`App.tsx` 的记录页）。
- 替玩家发的话（地图出发、送礼物）也走同一个 `send`，状态一起带上。

## 配图（CG）
- AI 用编号引用卡的配图库里的图。**编号怎么写是卡自己的规则**，写在卡的分区说明（instruction）里，舞台照着读。
- 推荐官方例子的做法：专门一个 `cg` 区，平时留空，剧情走到特别时刻 AI **只写一个编号数字**（`<cg>3</cg>`）。舞台读数字 → 解锁、存进存档 → 全屏弹出（`imageUrl(snap, n)` 取图）。见 `src/game/logic.ts` 的 `cgOf`。
- **SDK 的 `readZones` 不会把编号换成图**：要在正文里插图，自己用 `resolveImages(text, snap)`；不想正文里出图，用 `stripImages(text)` 去掉（官方例子就是这样，CG 只走全屏弹出）。
- 告诉 AI 已经解锁了哪些（附在 `withState` 的状态里），它才不会重复写同一张。

## 动效
`lastTurn = { prev, next, n }`：比较两份存档做「好感 +3」「解锁新 CG」。用 `n` 当 key 让动画重播。

## 替玩家发话前先确认
地图出发、送礼物这类会替玩家发一句话的按钮，**先弹确认**：发一句就是一轮，要消耗能量。确认框里引用的话要和真正发出去的一字不差。
