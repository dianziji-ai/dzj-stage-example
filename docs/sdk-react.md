# React 外壳 `@dianziji/stage/react`

用 React 写舞台（官方例子就是）。三层 SDK 的关系见 [sdk-client.md](sdk-client.md#分三层)。

## `<StageBoot>`

包在整个 App 外面，「准备好之前」的事都归它：看板娘加载页 → 读这一局 → 预加载首屏图 → 建好会话 → 淡出交给 App；出错给人话 + 重试，不白屏。刷新时上一轮还在生成会自动接着收。还会自动接收平台推的安全区（`pt-safe` 这些工具类才有值，见 [mobile.md](mobile.md#安全区刘海灵动岛home-条)）。

| 参数 | 说明 |
|---|---|
| `stage` | `createStage(...)` 的结果 |
| `preload?(snap)` | 返回首屏要先下好的图片地址（解码完再进，第一帧不闪）；单张最多等 5 秒，坏图跳过 |
| `normalize?(raw, snap)` | 读回来的存档过一遍：补默认值、丢非法值。玩家在本局面板改了存档也会过一遍 |
| `onTurn?({ raw, zones, save, snap })` | **游戏规则**：AI 这一轮写完那一刻调一次，返回新存档（返回 `undefined`＝不变）。抛错不会卡住游戏：这一轮存档不变，顶部提示「这一轮的状态没算上」 |
| `saveDelay?` | 存档器合并连续改动的时间，默认 800ms |
| `version?` | 版本 / 构建号，显示在加载页底部（官方例子：打包时自动生成 `BUILD 时间戳`） |

`onTurn` 只在 AI 写完时算一次：玩家提前走了这一轮就不算（不补算）。存档和历史允许对不上，AI 会容错。

## `useStage()` / `useStageActions()`

```ts
const g = useStage<MySave>()                          // 全部状态 + 方法（任何状态变了都重渲染）
// import { shallowEqual, useStage, useStageActions } from '@dianziji/stage/react'
// import type { SessionState } from '@dianziji/stage'   ← SessionState 在根入口，不在 /react
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

## 按分区订阅

> 分区的类型由卡决定：`kind: yaml`（或 `data`）是数据区，**区 id 叫 `action` 的是选项区**（`useZoneList` 只认它），其余是文字区。见 [example-card.md](example-card.md#分区)。

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

`useZoneText(id, key?, opts?)`、`useZoneData(id, opts?)`、`useZoneList(id, opts?)`、`useZone(id, opts?)` 都能传选项。给文字区加 hold 这样写：`useZoneText('scene', undefined, { hold: true, complete: true })`。

| 选项 | 意思 | 用在 |
|---|---|---|
| `hold: true` | 这一轮还没写到这个区时，用最近一次写过的值（不消失） | 表情、场景、状态这类「一直该有个值」的区 |
| `complete: true` | 这个区写完（出现结束标签）才换，不给写到一半的半截值 | 同上 |

正文、选项两个都不加。没有值时返回同一个空字符串 / 空对象 / 空数组，不会让组件白重渲染。

## 现成组件

| 组件 | 作用 |
|---|---|
| `<StageToaster />` | SDK 的结果自动弹成顶部提示：读取 / 存档 / 图册 / 结算出错，玩家在面板改了存档。`ops={[...]}` 改要提示哪些操作；自己也能 `toast('抓到啦！', 'ok')` |
| `<SaveIndicator />` | 「正在保存… / ✓ 已保存 / ⚠ 没存上 · 重试」，平时是手动保存按钮。`quiet`：平时不显示，只在存档时冒小图标 |
| `<TurnProgress />` | 「● 正在写 · 表情」+ 进度条；`labels={{ thought: '偷偷想心事中' }}` 换说法 |
| `<Splash />` | 启动加载页（StageBoot 自己用；想单独用也行） |

## 视频：`useTapVideo`

舞台里放视频**一律用它**（开场视频、彩蛋、过场）。安卓上的 UC / 夸克 / QQ / 微信浏览器会把页面里的 `<video>` 拉进自己的原生全屏播放器，网页上的按钮全被盖住，循环播放的永远播不完：玩家关不掉。`useTapVideo` 的做法是「点了才播」：

```tsx
import { TAP_VIDEO_ATTRS, useTapVideo } from '@dianziji/stage/react'

function Film({ src, poster, onClose }: { src: string; poster: string; onClose: () => void }) {
  const { ref, playing, play, stop } = useTapVideo(src, (ended) => ended && onClose()) // 收场回调：ended＝正常播完
  return (
    <div className="fixed inset-0 bg-black">
      {!playing && <img src={poster} className="absolute inset-0 size-full object-contain" />}   {/* 封面用图片 */}
      <video {...TAP_VIDEO_ATTRS} ref={ref} className={playing ? 'size-full' : 'invisible'} />   {/* 常驻挂载、不写 src */}
      {!playing && <button onClick={() => play()}>▶</button>}
      <button onClick={() => { stop(); onClose() }} className="absolute top-[calc(var(--safe-top)+12px)] right-3">关闭</button>
    </div>
  )
}
```

| 规矩 | 为什么 |
|---|---|
| `<video>` 不写 `src` / `autoPlay` / `loop`，由 `play()` 设 src | 没 src 浏览器就没东西可「嗅」；被拉进原生播放器的只可能是玩家自己点开、会播完的那一段 |
| 封面（第一帧）用 `<img>`，**不要**用 `<video>` 显示第一帧 | 同上：列表里一排带 src 的 video 全都会被嗅到 |
| `play()` 必须在点击回调里**同步**调用 | 算用户手势，才能带声音起播 |
| `<video>` 在组件挂载那一刻就要渲染出来 | 事件挂载时绑一次；视频按需出现就包一层子组件（像上面的 `Film`） |
| 关闭按钮一直在 | `stop()` 清源；原生播放器那边播完 / 退出全屏 / 出错 / 点了 6 秒没动也会自动清源收场 |
| 解构着用（`const { ref, playing } = …`） | 整个对象带着 `ref`，lint 会把 `tv.playing` 误判成「渲染时读 ref」 |

`playing`：正在播（封面该藏起来）。`play(muted?)`：起播。`stop()`：收场（清源、回到封面，回调 `ended=false`）。完整用法见官方例子 `src/game/VideoViewer.tsx`。

其他导出：`preloadImages(urls)`（预先下载并解码图片，切场景前用）、`useSession()`（拿会话本体，要在 React 外调方法时用）、`useSaveStatus(saver)`（存档器状态：`idle` / `saving` / `saved` / `error`）、`toast(text, kind)` / `dismissToast(id)`。

`StageToaster` / `SaveIndicator` / `TurnProgress` 只用 `sp-*` 配色变量（见 [panel.md](panel.md#换肤)），`className` 可以整个换掉外观。`Splash`（加载页）是固定的看板娘 + 奶油底，不能换皮（底部可以显示版本 / 构建号）。在 `StageBoot` 里面用不用传 `stage` / `saver`。
