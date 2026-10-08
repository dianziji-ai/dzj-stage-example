# 官方例子卡

例子的代码是照着卡 `dzj-stage-example`（「电子姬的同居日常」，网站上 `/chat/dzj-stage-example`；卡 id 是 `ca44070d`，素材地址里用的是它）写的：**分区 id、存档字段都和这张卡一一对应**。所以拿自己的卡直接 `npm run dev`，代码读不到这些分区，对话框会是空的、存档也存不进去。

想先看到例子的完整效果，在自己的卡里照下面建好分区和存档结构；做自己的游戏时，再按自己的卡改 `src/`。

## 分区

在网站编辑器「分区」页建这 8 个区（区 id 必须一样）。每个区的完整说明（instruction）和 AI 写法（schema）在 `src/game/__fixtures__/card.json` 的 `slots` 里，照抄过去即可。

| 区 id | 类型（kind） | 显示名 | 例子里怎么用 |
|---|---|---|---|
| `scene` | yaml | 场景 | `useZoneData('scene', HOLD)` → 地点 / 时间：换背景、顶栏 |
| `face` | yaml | 表情 | `useZoneData('face', HOLD)` → 表情：换立绘 |
| `narrative` | markdown | 正文 | `useZoneText('narrative')` → 对话框正文（`stripImages` 去图） |
| `thought` | yaml | 心声 | `useZoneText('thought', '心声')` → 心声气泡（写完才出现） |
| `cg` | markdown | 配图 | `cgOf()` 读数字 → 解锁回忆、全屏弹出 |
| `status` | yaml | 状态 | `onTurn` 里 `zoneNum(…, '好感变化')` 等 → 改存档 |
| `game` | yaml | 小游戏 | `onTurn` 里读「硬币」→ 加进存档 |
| `action` | — | 选项 | `useZoneList('action')` → 选项按钮 |

`HOLD`＝`{ hold: true, complete: true }`（这一轮还没写到用上一次的、写完才换，见 [sdk-react.md](sdk-react.md#按分区订阅)）。

分区页里每个区的三个字段：

| 字段 | 是什么 |
|---|---|
| `kind` | 类型。`yaml`（或 `data`）＝数据区，AI 写「键: 值」，SDK 解析成对象；不写或 `markdown`＝文字区。★**选项区的 id 必须叫 `action`**：SDK 只认这个 id 是选项（`useZoneList`），叫别的名字选项永远是空的 |
| `instruction` | 给 AI 的说明：这一区写什么、什么时候写 |
| `schema` | AI 写法的骨架（数据区每一行的格式） |

## 存档结构

仓库里的 `src/game/state.schema.json` 就是这张卡的存档结构（字段：`location` 地点、`unlockedCg` 已解锁的回忆、`day` 天数、`love` 好感、`mood` 心情、`claw` 抓娃娃）。把它整份粘进你的卡：编辑器「舞台 → ② 存档结构」保存。

## 开场

`src/game/__fixtures__/card.json` 的 `opening` 是这张卡的开场原文：把它填进编辑器「开场」页，这样新游戏的第一屏就有表情、场景、正文和第 1 张回忆。

## 素材

立绘、背景、回忆 CG、娃娃图的地址在 `src/game/manifest.json`，指向官方卡的素材库，可以直接用来看效果。做自己的卡时，把图传到自己卡的素材库，换掉这份清单里的地址。回忆 CG 要在编辑器「素材库 → 相册」里按编号 1–8 配好（`imageUrl` 按编号取）。

视频也在这份清单里：`film` 是舞台开场视频（新开一局进游戏前放一次，可跳过），`eggs` 是图册里一直开放的彩蛋视频。每段都是 `{ src: 视频地址, poster: 第一帧截图 }`，不想要就删掉这两项。播放走 SDK 的 `useTapVideo`（`src/game/VideoViewer.tsx`），点了才播，安卓浏览器也关得掉。

## 测试用的真实回复

`src/game/logic.test.ts` 用 `__fixtures__/card.json` 里的真实开场做测试。想用自己卡的回复做测试：本地开发打开舞台 → 切到对话模式（或网站工具栏的「记录」）→ 找到那条 AI 回复，复制原文。
