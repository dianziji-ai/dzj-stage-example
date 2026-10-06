---
name: stage-workflow
description: 开发电子姬舞台的完整流程（每次开工先读）：读手册 → 问作者 → 定方案 → 写 → 自检 → 交付。作者让你做舞台、改舞台、加页面或玩法时用。
---

# 开发流程

总规则在仓库根目录 `AGENTS.md`，先读它。下面是按顺序要做的事，**每一步做完再进下一步**。

## 1. 读
- `AGENTS.md`（铁律）。
- `docs/` 全部（从 `docs/README.md` 开始）。
- 例子的 `src/`：`main.tsx` → `App.tsx` → `game/useGame.ts` → `game/logic.ts`，看清数据怎么流。
- 作者自己的卡：没有就让作者在网站上新游戏走完开场、生成开发凭证贴进 `.env`，然后 `npm run dev` 打开，看 SDK 读到的 `snap`（`slots` 分区、`state_schema` 存档结构、`setup` 初始设定、`image_pack` 配图库）。

## 2. 问（问清楚再写代码）
一次问完，别边写边问。作者没回答的用括号里的默认：
1. 电脑和手机都要适配吗？（**都要**；只做竖屏）
2. 分区有哪些、各是什么（正文 / 数据 / 选项）？每轮 AI 写哪些？
3. 存档存什么？存档结构写好了吗？（没写：先帮他设计结构，让他贴进网站编辑器「舞台 → ② 存档结构」）
4. 每一轮怎么结算（好感、金币、解锁…）？要附给 AI 哪些当前数值？
5. 素材在卡的素材库里了吗？（立绘、背景、CG 的地址）
6. 要哪些页面和玩法？参考例子里的哪些（地图、图册、记录、小游戏）？

## 3. 定方案（给作者看，确认后再写）
写清楚：
- 页面和组件清单（每个组件一个文件，放哪个目录）。
- 存档字段和类型（对上存档结构）。
- `onTurn`：每轮从哪些区读什么、存档怎么变。
- `withState`：每次发话附给 AI 什么。
- 手机和电脑各长什么样（一两句话或草图）。

## 3.5 先定义游戏状态（存档结构），再写存档代码
1. 按定好的存档字段，生成一份 JSON Schema（根节点 `"type": "object"`，每个字段带 `type`、`default`，数值带 `minimum` / `maximum`，`"additionalProperties": false`）。格式见 `docs/state.md`。
2. 写进 `src/game/state.schema.json`（和代码放一起）。**先给作者看、说明「推上去后不符合新结构的老存档会回到开局」，作者同意后**执行 `npm run schema:push`（用 `.env` 的开发凭证写进卡；报「只有开发凭证…」就请作者重新生成开发凭证）。也可以让作者自己贴到网站编辑器「舞台 → ② 存档结构」。
3. 推成功后再写 `GameSave` 类型、`normalize`、`onTurn`；同步 `logic.test.ts` 里「结构和代码对得上」那条测试。验证：`npm run dev` 打开舞台 → 本局面板「存档」页能看到结构。
4. 以后改存档字段：同样先改网站上的结构，再改代码，两边要对得上（结构里没有的字段存不进去）。

## 4. 写
- 照 `stage-react`、`stage-responsive`、`stage-assets`、`stage-performance`、`stage-game-logic` 的做法。
- 纯逻辑先写、先测（`src/game/logic.ts` + `logic.test.ts`，用卡的真实数据做 fixture）。
- 只改 `src/` 和 `public/`。**不碰 `packages/`。**

## 5. 自检（见 `stage-release` 的清单）
- `npm test`、`npx tsc -b`、`npm run lint`、`npm run pack` 全过。
- 电脑和手机各截图看一遍：刘海、home 条、键盘、长文本、空状态、出错状态。

## 6. 交付
如实告诉作者：做了什么、改了哪些文件、怎么验证的、还有什么没做 / 没验证。没跑过的不说「做完了」。
