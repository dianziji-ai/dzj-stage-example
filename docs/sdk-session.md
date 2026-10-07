# 会话引擎 `@dianziji/stage`

React 外壳（[sdk-react.md](sdk-react.md)）就是包了它；不用 React 也能直接用：

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
| 回看 | `prevTurn()` / `nextTurn()` / `viewTurn(id)`：`zones` / `held` 换成那一轮的（`view`＝正在看的那条 AI 回复的 id，null＝最新）；只是看，存档不动；生成中不能翻、玩家一发话自动回到最新；翻到已加载的最早一轮自动往前加载 |

其他工具：

```ts
readZones(原文, snap)          // 原文 → 分区（和网站聊天页同一套）。配图编号 ![](17) 原样保留，不换成地址
zoneNum(zones, 'status', '好感变化')   // 安全取值：没写 → null（AI 不一定每轮都写每一行）
zoneText(zones, 'status', '心情')      // 没写 → ''
zoneList(zones, 'action')              // 没写 → []
zoneData(zones, 'face')                // 没写 → {}
renderMarkdown(md)             // markdown → 安全 HTML（原始 HTML 转义、危险链接清空；对白「」包成 <span class="quote">）
createSaver(stage)             // 单独用存档器：save(next) / save(next, { now: true }) / saveNow() / flush()
```

## 配图编号

AI 在回复里引用卡的配图库（`snap.image_pack`）时写编号。**`readZones` 不碰它**：编号原样留在分区里，拿来做什么由舞台决定（弹全屏 CG、插进正文、解锁图册、或者不显示）。需要时用这几个 helper：

```ts
import { imageRefs, imageUrl, resolveImages, stripImages } from '@dianziji/stage'

imageRefs('![](3) 和 ![](5)')        // → [3, 5]   原文里引用了哪些编号（按出现顺序、去重）
imageUrl(snap, 3)                    // → 'https://…' 编号 → 配图库里的地址；没有＝null
imageUrl(snap, '3')                  // 也收字符串 '3' 和 '![](3)'：分区里写哪种，zoneText 读出来直接传
resolveImages(text, snap)            // ![](3) → ![](https://…)；配图库里没有的编号整个删掉
stripImages(text)                    // 把 ![](编号) 全删掉（正文里不显示图时用）
```

只认「括号里是纯数字」的写法；`![](https://…)` 这种外链图四个函数都不动。

**编号怎么写是这张卡自己的规则**（写在卡的分区说明里）。官方例子的做法：专门一个 `cg` 区，剧情走到特别时刻 AI **只写一个编号数字**（`<cg>3</cg>`），舞台读出数字解锁回忆、全屏弹出（`imageUrl` 取图）；正文里万一出现 `![](编号)` 用 `stripImages` 去掉。见 `src/game/logic.ts` 的 `cgOf`、`src/game/useGame.ts`。

