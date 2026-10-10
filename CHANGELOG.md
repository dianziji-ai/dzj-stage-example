# 更新记录

## 2026-10-10 · 舞台 SDK 改成 npm 包

| 包 | 版本 |
|---|---|
| `@dianziji/stage` | 0.4.0 |
| `@dianziji/stage-panel` | 0.2.2 |
| `@dianziji/stage-settings` | 0.2.0 |
| `@dianziji/stage-voice` | 0.1.1 |
| `@dianziji/stage-sfx` | 0.1.1 |

- ★**SDK 从本仓库拆出去了**：`packages/` 和 `scripts/sdk-lock.mjs` 删掉，五个包发布在 npm（`@dianziji/*`），源码在 [dianziji-ai/dzj-stage-sdk](https://github.com/dianziji-ai/dzj-stage-sdk)。`npm install` 就装好，代码里的 `import` 一行不用改。
- 新手册 [docs/sdk.md](docs/sdk.md)：有哪几个包、去哪查 API（编辑器悬停看类型说明 / 包里的 README / 源码）、怎么升级（`npm outdated`、`npm update`）、不够用怎么办。
- AGENTS.md 和 skills 同步：「packages/ 只读、不跑 sdk:lock」改成「别改 node_modules 里的 SDK、查 API 先看类型声明、升级先问作者」。
- 从旧版迁过来：删掉自己仓库里的 `packages/`、`scripts/sdk-lock.mjs`，`package.json` 去掉 `workspaces` 和 `pretest` / `test:sdk` / `sdk:lock` 三个脚本，SDK 依赖改成 `"^0.4.0"` 这种版本号，删掉 `package-lock.json` 和 `node_modules` 重新 `npm install`；游戏有用 jsdom 的测试就自己加 `jsdom` 开发依赖。

## 内测版 v0.3.1-beta — 2026-10-09

| 包 / 部分 | 版本 |
|---|---|
| `@dianziji/stage` 舞台 SDK | 0.3.3（详见 [packages/stage/CHANGELOG.md](https://github.com/dianziji-ai/dzj-stage-sdk/blob/main/packages/stage/CHANGELOG.md)） |

- ★**卡上有的一律从快照读**：快照新增 `shortcuts` 快捷指令、`bgm` 背景音乐、`characters` 角色包，`card` 多了封面 / 背景 / 菜单背景。作者在编辑器改一处，对话模式和舞台都跟着变。用法见 [docs/bridge.md](docs/bridge.md#卡上有的一律从快照读)；给 AI 的规则写进了 AGENTS.md 和 skills（stage-game-logic、stage-assets）。
- ★新模块 **`@dianziji/stage-settings` 0.1.0**（播放设置，独立、只依赖 react）：一个面板管文本速度（逐字打出）、字号、动效、选项行为（默认填入确认）、自动播放，默认值照柳月儿原卡；存玩家本机。官方例子标题栏「▶ 自动」+「调节」接上了。手册 [docs/settings.md](docs/settings.md)，skill `stage-settings`。
- 官方例子行动选项改成一条一条的「光带」（中间深两头渐隐、上沿彩色发丝线，人物能透出来）；心声和选项读到最后一句才一起浮出；生成中点着读，写完不跳回第一句。
- ★官方例子心声改成独立分区 `thought`（原来是旁白里的 `> 💭` 引用块，可选格式模型常不写）：每轮一句，舞台 `useZoneText('thought')` 读，手册第 1 节有说明。
- ★SDK 0.3.4 `pickImage`：挑图规则写在卡的配图库分组名里；官方例子立绘 / 背景 / 地图全从配图库挑，加了睡衣、外出服、打游戏、睡着和房间白天。手册第 3 节重写。
- 官方例子接上快捷指令：卡上配了 8 条，舞台 ⚡ 按钮从快照读（`useShortcuts` + `ShortcutTray`），手册见 [docs/example-card.md](docs/example-card.md) 第 6 节。
- 0.3.2 修了 `<CrossfadeImage>` 立绘被原图尺寸撑大（只剩一个大头）。

## 内测版 v0.3.0-beta — 2026-10-09

★官方例子「电子姬的同居日常」重做：**旁白区 + 对话区**，一句一句播、立绘一句一换。手册 [docs/example-card.md](docs/example-card.md) 按「分区 → 拆句 → 选立绘 → 结算 → 选项」重写成教程。

| 包 / 部分 | 版本 | 详细记录 |
|---|---|---|
| `@dianziji/stage` 舞台 SDK | 0.3.1 | 没变 |
| `@dianziji/stage-panel` 本局面板 | 0.2.1 | 去掉「历史」标签，见 [packages/stage-panel/CHANGELOG.md](https://github.com/dianziji-ai/dzj-stage-sdk/blob/main/packages/stage-panel/CHANGELOG.md) |
| 官方例子 | 0.3.0 | 本条 |

- **卡的分区**：`face`（表情）、`thought`（心声）两个区去掉；新增 `talk` 对话区（YAML 列表，每句 `谁 / 表情 / 动作 / 说`），`narrative` 改成只写旁白（心声 / 屏幕消息写成引用块）。线上的例子卡已经换成新结构，`src/game/__fixtures__/card.json` 同步。
- **拆句**：`src/game/beats.ts`——一轮拆成「旁白 → 你说的 → 她说的」，屏幕消息合成一句、心声单独取出来飘在立绘旁。
- **立绘**：`src/game/expression.ts`——表情先认词表，再按意思就近认（脸红 → 害羞），认不出沿用上一句（`spriteAt`）。
- **对话框**：galgame 式，点一下下一句；名牌和顶上那道光按她这句的表情换颜色；「▼ 继续」在右下角；读到最后一句才出选项。手机不常驻输入栏，标题栏一颗气泡点开全屏输入，生成中底下浮一条细进度。
- **换场选项**：选项区可选的第 4 条 `【前往：cafe】一句话`，做成带目的地背景的「门」；地图外的地点整条不出。
- **去掉的**：记录页（网站的「记录」就是）、打字机、表情区 / 心声区相关代码。
- **测试**：`beats.test.ts`（拆句、认表情、选立绘）、`logic.test.ts`（结算、换场）共 55 条，都用卡的真实开场。

## 内测版 v0.2.0-beta — 2026-10-09

★舞台和网站之间改成一座桥（postMessage）：**舞台不连后端、没有凭证、不调任何接口**。网站把这一局的快照推进来，舞台有事请网站去做；聊天、生成、扣费、换模型、MOD、记忆、回溯、重生、存档落库全是网站现成的那一套。在网站输入框发的话、在对话模式里回溯 / 编辑 / 删除、换了模型，舞台都立刻跟上。协议见 [docs/bridge.md](docs/bridge.md)。

| 包 / 部分 | 版本 | 详细记录 |
|---|---|---|
| `@dianziji/stage` 舞台 SDK | 0.3.1 | [packages/stage/CHANGELOG.md](https://github.com/dianziji-ai/dzj-stage-sdk/blob/main/packages/stage/CHANGELOG.md) |
| `@dianziji/stage-panel` 本局面板 | 0.2.0 | [packages/stage-panel/CHANGELOG.md](https://github.com/dianziji-ai/dzj-stage-sdk/blob/main/packages/stage-panel/CHANGELOG.md) |

- **本地开发**：`npm run dev` → 网站上进入你的卡，工具行「开发」→ 填本机地址（如 `http://localhost:5173`），网站里的舞台就加载你本机的页面，热更新照常。没有凭证、没有 `.env`，直接打开 localhost 会提示去网站里打开。
- **去掉的**：凭证（`readLaunch` / `.env` / 舞台地址 `#token=`）、舞台 HTTP 接口（`/api/v1/stage*`，平台已下线）、`npm run schema:push`（存档结构粘进网站编辑器「舞台 → ② 存档结构」）、`docs/api.md`（换成 [docs/bridge.md](docs/bridge.md)）。
- **新增**：`stop()` 停止生成、`regenerate()` 重新生成、`subscribe()` 订阅快照；网站版本和舞台 SDK 版本对不上时直接说明是哪边太旧；`<CrossfadeImage>` 换立绘 / 背景不闪、交叉淡化。
- **已上传的旧版舞台**要用新 SDK 重新 `npm run pack` 上传，旧包连不上新网站。

## 内测版 v0.1.0-beta — 2026-10-07

电子姬「舞台引擎」开启内测。舞台＝一张卡的画面：AI 照常按卡的提示词和分区写剧情，舞台把分区渲染成画面，聊天、存档、计费都走电子姬平台。本仓库是官方例子 + 舞台 SDK。

本版包含：

| 包 / 部分 | 版本 | 详细记录 |
|---|---|---|
| `@dianziji/stage` 舞台 SDK | 0.1.1 | [packages/stage/CHANGELOG.md](https://github.com/dianziji-ai/dzj-stage-sdk/blob/main/packages/stage/CHANGELOG.md) |
| `@dianziji/stage-panel` 本局面板 | 0.1.0 | [packages/stage-panel/CHANGELOG.md](https://github.com/dianziji-ai/dzj-stage-sdk/blob/main/packages/stage-panel/CHANGELOG.md) |
| 官方例子「电子姬的同居日常」 | 0.1.0 | 本文件 |

### 舞台 SDK `@dianziji/stage`

分三层，上层只依赖下层：

- **客户端 `@dianziji/stage/client`**（零依赖）：`createStage` → 读这一局（`load`）、发一句话收流（`send` / `resume`）、存档（`save`）、图册（`gallery`）、改存档结构（`saveSchema`）；`readLaunch()` 读平台交来的凭证；事件广播 `stage.on`；`StageError` 统一错误；`withState` / `splitState` 附「此刻状态」。
- **会话引擎 `@dianziji/stage`**（不依赖 React）：`createSession` 管发消息、收流、出错重说、刷新接着收、往前翻历史、内置存档器（合并连续改动、同一时间只发一个、关页面 / 切后台用 keepalive 发完）、本局面板改存档自动同步、`onTurn` 每轮结算（AI 写完那一刻算一次）。
  - 分区：`readZones` 每帧最多解析一次，内容没变的区稳定引用；安全取值 `zoneNum` / `zoneText` / `zoneList` / `zoneData`。
  - 配图编号：`readZones` 不再把 `![](n)` 换成图片地址，编号原样留给舞台决定怎么用；配套 helper `imageRefs` / `imageUrl` / `resolveImages` / `stripImages`。
  - `renderMarkdown`：markdown → 安全 HTML。
  - 安全区：`pt-safe` / `pb-safe` / `px-safe` / `pb-composer` 工具类和 `--safe-*` 变量随 `styles.css` 提供；`watchViewport()` 接收平台推送。
- **React 外壳 `@dianziji/stage/react`**：`<StageBoot>`（看板娘加载页 + 预加载 + 出错重试，自动接收安全区；加载页底部显示构建号）、`useStage` / `useStageActions`、按分区订阅 `useZone` / `useZoneText` / `useZoneData` / `useZoneList` / `useWritingZone`、现成组件 `<StageToaster>` / `<SaveIndicator>` / `<TurnProgress>` / `<Splash>`。
- **`useTapVideo` 两段式视频**：点了才给 `<video>` 设 src，不自动播、不循环；播完 / 退出原生全屏 / 出错 / 点了 6 秒没动就清源收场。解决安卓 UC / 夸克 / QQ / 微信把视频拉进原生全屏、玩家关不掉的问题。
- 测试：源码与测试一一对应，`npm run test:sdk` 带覆盖率门槛，并检查 `packages/` 没被改过（SDK 只读，官方升级时整个替换）。

### 本局面板 `@dianziji/stage-panel`

- `<StagePanel stage={stage} />`：每个舞台都带的「本局」面板，上线也给玩家看。六个标签：概览、初始设定、历史（每轮消耗）、图册、存档（玩家可直接改 JSON，后端按存档结构校验）、分区。
- 开发凭证下多出 token 细节、消息 id、设定 key 和原文。
- 电脑居中弹窗、手机全屏并让开安全区；面板代码第一次打开才下载；可用 `--color-sp-*` 变量换肤。

### 平台对接

- **进场授权**：玩家每次进入舞台平台都弹授权框（读头像 / ID / 用户名、以玩家身份在这一局聊天、读写这一局存档），同意后才进。
- **凭证**：平台签 6 小时有效的凭证，放在舞台地址 `#` 后面（`#api=…&token=…`）交给舞台；`readLaunch()` 读完从地址栏擦掉。过期了玩家刷新页面就会重签。没有凭证时 SDK 不发请求，直接提示「请从电子姬网站进入这张卡」。
- **本地开发凭证**：网站上进入自己的卡 → 工具行「开发」→ 生成凭证（7 天有效），本地 `npm run dev` 连的就是网站上同一局。
- **安全区由平台推送**：iframe 里读不到刘海 / home 条高度，平台在外层量好后用 `stage:viewport` 推给舞台；舞台开始接收时先发 `stage:hello`，平台收到再推，不丢第一次。键盘不推。
- **加载页构建号**：`npm run pack` 把打包时刻写进加载页底部（`BUILD 时间戳`，本地显示 `BUILD dev`），上传后刷新就能确认玩家拿到的是不是新版。
- **存档结构推送**：`PUT /stage/schema`（SDK `stage.saveSchema`，命令 `npm run schema:push`），只认开发凭证 + 卡的作者。
- HTTP 接口：`GET /stage`、`POST /stage/messages`、收流、`PUT /stage/save`、`PUT /stage/schema`、`GET /stage/gallery`；存档最大 64KB；限流每人每分钟 60 次。详见 [docs/api.md](docs/api.md)、[docs/errors.md](docs/errors.md)。
- 上线：`npm run pack` 生成 `stage.zip`（解压后最多 30MB），全部传完才切换版本，平台保留最近 3 个版本；舞台放在独立域名，碰不到网站的登录信息。

### 官方例子：galgame「电子姬的同居日常」

对应网站上的卡 [`dzj-stage-example`](https://dianziji.com/chat/dzj-stage-example)。React 19 + Vite + Tailwind CSS v4，电脑、手机都适配。

- **分区**：8 个区 `scene` 场景、`face` 表情、`narrative` 正文、`thought` 心声、`cg` 配图、`status` 状态、`game` 小游戏、`action` 选项，分别驱动背景、立绘、对话框、心声气泡、回忆 CG、结算和选项按钮。建卡方法见 [docs/example-card.md](docs/example-card.md)。
- **存档**：`src/game/state.schema.json`（地点、已解锁回忆、天数、好感、心情、抓娃娃），`onTurn` 每轮结算，`withState` 把「此刻状态」附给 AI。
- **页面**：地图（6 个地点）、对话记录、图册（8 张回忆 CG，全屏查看）、本局面板入口。
- **抓娃娃**：舞台内的小游戏（`src/claw/`），抓到的娃娃进图册的收藏柜；演示「舞台里能放任何玩法」。
- **开场视频**：新开一局进游戏前放一次，可跳过。
- **图册彩蛋视频**：图册里一直开放。两段视频都走 `useTapVideo`。
- **音乐**：8-bit BGM + 音效（`src/audio/`），按地点切换曲子。

### 开发文档与 AI 开发规则

- **开发手册 [docs/](docs/README.md)**：上手、官方例子卡、上线、电脑 / 手机、存档与此刻状态、三层 SDK、本局面板、HTTP 接口、错误码。
- **[AGENTS.md](AGENTS.md)**：给 AI 的总规则（开工流程、铁律、不要做的事、技能索引）；`CLAUDE.md` 引用它。
- **`.claude/skills/` 八个开发技能**：`stage-workflow`（完整流程）、`stage-react`、`stage-responsive`、`stage-assets`、`stage-performance`、`stage-game-logic`、`stage-release`、`stage-pitfalls`（踩过的坑）。
- 命令：`npm run dev` / `npm test` / `npm run test:sdk` / `npm run lint` / `npm run pack` / `npm run schema:push`。

### 内测须知

- **上传舞台目前由官方开通。** 舞台上传是平台级能力：内测作者把 `stage.zip` 和卡 id 发给官方，审核后由平台管理员上传（见 [docs/deploy.md](docs/deploy.md)）。
- **只做竖屏**，不做横屏布局。
- **手机上的输入一律走全屏输入层**（官方例子的 `src/components/InputSheet.tsx`），平台不推键盘高度。
- **例子代码绑定官方例子卡**：分区 id 和存档字段要对上。用自己的卡跑，先照 [docs/example-card.md](docs/example-card.md) 建好 8 个分区、`npm run schema:push`，不然对话框是空的。
- **本地连的是真实的一局**：每发一句都扣作者的能量、永久写进这一局的历史。
- **SDK 暂未发布 npm**，随本仓库 `packages/` 提供且只读；不够用请向官方提需求。
- **图片、视频放卡的素材库**，不外链别的网站。
- 存档最大 64KB；接口限流每人每分钟 60 次。
- **许可**：专有软件，不是开源软件。只允许为电子姬平台上的卡开发舞台并在电子姬平台发布，详见 [LICENSE](LICENSE)。
