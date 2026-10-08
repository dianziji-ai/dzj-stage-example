# 更新记录

## 内测版 v0.2.0-beta — 2026-10-09

★舞台和网站之间改成一座桥（postMessage）：**舞台不连后端、没有凭证、不调任何接口**。网站把这一局的快照推进来，舞台有事请网站去做；聊天、生成、扣费、换模型、MOD、记忆、回溯、重生、存档落库全是网站现成的那一套。在网站输入框发的话、在对话模式里回溯 / 编辑 / 删除、换了模型，舞台都立刻跟上。协议见 [docs/bridge.md](docs/bridge.md)。

| 包 / 部分 | 版本 | 详细记录 |
|---|---|---|
| `@dianziji/stage` 舞台 SDK | 0.3.0 | [packages/stage/CHANGELOG.md](packages/stage/CHANGELOG.md) |
| `@dianziji/stage-panel` 本局面板 | 0.2.0 | [packages/stage-panel/CHANGELOG.md](packages/stage-panel/CHANGELOG.md) |

- **本地开发**：`npm run dev` → 网站上进入你的卡，工具行「开发」→ 填本机地址（如 `http://localhost:5173`），网站里的舞台就加载你本机的页面，热更新照常。没有凭证、没有 `.env`，直接打开 localhost 会提示去网站里打开。
- **去掉的**：凭证（`readLaunch` / `.env` / 舞台地址 `#token=`）、舞台 HTTP 接口（`/api/v1/stage*`，平台已下线）、`npm run schema:push`（存档结构粘进网站编辑器「舞台 → ② 存档结构」）、`docs/api.md`（换成 [docs/bridge.md](docs/bridge.md)）。
- **新增**：`stop()` 停止生成、`regenerate()` 重新生成、`subscribe()` 订阅快照；网站版本和舞台 SDK 版本对不上时直接说明是哪边太旧。
- **已上传的旧版舞台**要用新 SDK 重新 `npm run pack` 上传，旧包连不上新网站。

## 内测版 v0.1.0-beta — 2026-10-07

电子姬「舞台引擎」开启内测。舞台＝一张卡的画面：AI 照常按卡的提示词和分区写剧情，舞台把分区渲染成画面，聊天、存档、计费都走电子姬平台。本仓库是官方例子 + 舞台 SDK。

本版包含：

| 包 / 部分 | 版本 | 详细记录 |
|---|---|---|
| `@dianziji/stage` 舞台 SDK | 0.1.1 | [packages/stage/CHANGELOG.md](packages/stage/CHANGELOG.md) |
| `@dianziji/stage-panel` 本局面板 | 0.1.0 | [packages/stage-panel/CHANGELOG.md](packages/stage-panel/CHANGELOG.md) |
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
