# @dianziji/stage

官方维护的版本记录（暂未发布 npm）。★作者开发时不要改这个包：不够用向官方提需求，官方出新版时整个替换。

## 0.4.0 — 2026-10-09

★**角色配音 `stage.speak`**：网站用作者在角色包里给角色配的声音（声音工坊）念一句，返回音频地址，舞台自己播。

- `stage.speak({ who, text, emotion? })` → `{ url, cost, cached }`。who＝角色名或别名；按字数扣玩家能量，同一句同情绪重听不扣（`cached`）。
- 快照 `characters[].voice`：这个角色有没有配声音（老网站没这项＝false）。
- 新错误码 `no_voice`：角色没配声音 / 声音已下架。不算出错，跳过这句。
- 协议版本不变（PROTOCOL 仍是 1）：只加了一个请求方法和一个字段，老舞台不调就不受影响；**新舞台要等网站先上线**（老网站不认 speak，会回「不认识的请求」）。
- 一般不直接调：用 `@dianziji/stage-voice` 的 `useVoice`（检查、排队、预取、出错就停都在里面）。

## 0.3.4 — 2026-10-09

★**按标签挑图 `pickImage`**：立绘、背景、CG 的挑图规则写在卡的**配图库分组名**里，舞台代码里不写图、不写词表，作者改配图库就生效（纯函数，不需要网站改动）。

- 分组名 `类别/标签/标签…`，一张图可以进好几个组；标签 `名字|近义词|…`（近义词越靠前越优先，也当替补用）；可带键 `表情=开心|笑`，只和同键的维度比。
- `pickImage(snap, '立绘', [{ value: 谁, must: true }, { value: 穿着, key: '穿着' }, { value: 表情, key: '表情' }], { seed, prev })`：
  重要的维度先比（正好是标签 > 是近义词 > 原文里包含）→ 和上一张共有的标签多 → 「默认」组 → 多余标签少 → seed 固定挑一张。挑不出＝null（沿用上一张）。
- `imageTags(img, 类别)`、`imageVocab(snap, 类别, 键?)`：看一张图的标签、某个类别的词表。
- 技术验证：柳月儿（153 张立绘，穿着 × 行为 × 表情）的手写挑图逻辑全部改成配图库分组（50 组），拿 4442 句真实回复对照，99.3% 挑出同一种图；剩下的是词表外的表情（迷糊 / 犹豫），手写版退到「平静」、新版留在上一张的表情。

## 0.3.3 — 2026-10-09

★**卡上有的一律从快照读**：作者在网站编辑器改一处，对话模式和舞台都跟着变，舞台代码里别再写一份。快照新增（需要网站同步部署；网站老一点没发时 SDK 补成空的，不会是 undefined）：

| 字段 | 是什么 | 编辑器里在哪 |
|---|---|---|
| `shortcuts` | 快捷指令 `{ label, command, mode }`，`mode`：`fill` 填进输入框（缺省）/ `send` 直接发 | 快捷指令 |
| `bgm` | 背景音乐曲库 `{ name, url }`，第一首＝默认播的那首 | 背景音乐 |
| `characters` | 角色包 `{ names, image, desc }` | 角色包 |
| `card.avatar` / `card.background` / `card.menu_background` | 封面、对话背景、菜单背景 | 概要 / 外观 |

新类型：`StageShortcut`、`StageTrack`、`StageCharacter`。初始设定照旧：玩家填了什么就是什么（`snap.setup`）。

## 0.3.2 — 2026-10-09

- 修 `<CrossfadeImage>`：外层网格的行 / 列钉成容器尺寸（`minmax(0, 1fr)`）。之前默认的 auto 轨道会被图的原始尺寸撑开，图上写的 `h-full` 变成「原图有多大显示多大」——1600 高的立绘在屏幕上只剩一个大头，屏幕越大越明显。**用了 0.3.1 `CrossfadeImage` 放立绘的舞台，换成 0.3.2 重新打包上传即可。**

## 0.3.1 — 2026-10-09

- 新增 `<CrossfadeImage>`（`@dianziji/stage/react`）：换图不闪、换得顺。新图下载 + 解码完才上屏，立绘交叉淡化（新淡入、旧同时淡出，透明底不重影），背景 `mode="over"` 盖上去淡入；连着换只显示最后一张，加载失败保留原图。官方例子 `Scene.tsx` 改用它（删掉自己写的 `Fade`）。

## 0.3.0 — 2026-10-08

★舞台和网站之间改成一座桥（postMessage）：**舞台不连后端、没有凭证**。网站把这一局的快照推进来，舞台有事请网站去做。聊天、流式、扣费、换模型、MOD、记忆、回溯、重生全是网站现成的那一套——在网站输入框发的话、在对话模式里回溯 / 编辑 / 删除、换了模型，舞台都立刻跟上。协议见 `docs/bridge.md`、`src/client/protocol.ts`。

- `createStage()` 不要参数（`src/stage.ts` 就一行）。新增 `ready()`（等网站给第一份快照，3 秒没有＝不在网站里）、`snapshot()`、`subscribe(fn(snap, changed))`、`stop()`、`regenerate()`、`older()`；`send(text)` 开始生成（「在生成」已推到舞台）就 resolve，没发出去（能量不够这类）直接 reject；之后的流式 / 写完 / 失败都看快照的 `live` / `history` / `error`。
- 快照新增 `live { said, text, reasoning } | null`、`error`、`meta { model, channel, dev }`、`safe_area`；去掉 `streaming`、`dev`。
- 会话：一轮从 `live` 有值开始、`live` 变 null 结束（谁发起的都一样，网站输入框发的也结算）；历史整份跟着网站换（回溯 / 编辑 / 删除后自动跟上，回看的那条没了就回到最新）。新增 `session.stop()` / `session.regenerate()`；`loadOlder()` 改为请网站读。
- 删掉：`readLaunch`、`decodeToken`、`tokenInfo`、`load`、`resume`、`saveSchema`、`watchViewport`（改为 `applySafeArea(area)`，StageBoot 自动跟快照）、存档器的 `keepalive`。`StageOp` 去掉 `connect`、`load`，`StageToaster` 默认弹 `older` / `save` / `gallery` / `turn`。
- `StageBoot`：「连接网站…」；不在网站里打开时说明本地开发要在网站里打开。
- 修：分区解析（`zones.gen.js`）里整份读取 `import.meta.env`，Vite 打包时会把本机 `.env` 里所有 `VITE_` 开头的值一起塞进舞台包；现在生成时替换成空对象，包里不再带任何环境变量。

## 0.2.3 — 2026-10-08

- 新增 `stage.open(tool)`：请网站打开它自己的工具——`model` 换模型 / 调参数、`mod` 挂 MOD、`session` 本局（设定、存档、图册、消费记录）、`memory` 记忆、`chat` 切到对话模式。舞台不用自己做这些面板。只在网站里打开舞台时有效，单独打开 localhost 返回 false。
- 本地开发改为在网站里调：工具行「开发」→ 本地开发，填本机地址，网站里的舞台就加载你本机的页面（凭证由网站自动传入，热更新照常）。例子工程的开发服务器加了 `Access-Control-Allow-Private-Network` 头。
- **去掉 `.env` 凭证这条路**：`src/stage.ts` 只认 `readLaunch()`；删 `.env.example`、`vite.config.ts` 里打包清空凭证那段、`npm run schema:push`（存档结构改为粘进网站编辑器「舞台 → ② 存档结构」）。直接打开 localhost 会提示去网站里打开。

## 0.2.2 — 2026-10-08

- 撤掉 0.2.1 的 `local`：本机存储按卡分开改由**平台**做——舞台上传时平台往 `index.html` 注入一小段脚本，把页面里的 `localStorage` / `sessionStorage` 换成自动加 `stage:{卡 id}:` 前缀的版本。作者照常写 `localStorage`，不用学新东西，已经打好的包重新上传就生效。

## 0.2.1 — 2026-10-08

- 新增本机存储 `local`（键自动加卡 id 前缀）。（0.2.2 已撤掉，改由平台注入）

## 0.2.0 — 2026-10-08

- 新增回看「上一轮 / 下一轮」：会话 `prevTurn()` / `nextTurn()` / `viewTurn(id)` + 状态 `view`；React `useTurnCursor()`（`viewing` / `back` / `canPrev` / `canNext` / `said` / `id` / `prev` / `next` / `latest`）。回看时 `zones` / `held` 换成那一轮的，按区订阅的组件自动倒回；只是看（存档不动、不结算），生成中不能翻、发话自动回到最新，翻到已加载的最早一轮自动往前加载。
- `StageActions` / `useStage()` 多了 `viewTurn` / `prevTurn` / `nextTurn`；`@dianziji/stage` 导出 `aiTurns`（能回看的 AI 回复）/ `saidBefore`（某轮之前玩家说的话）。

## 0.1.1 — 2026-10-07

- 新增 `useTapVideo(src, onStop?)` + `TAP_VIDEO_ATTRS`（`@dianziji/stage/react`）：两段式视频。点了才给 `<video>` 设 src、不自动播、不循环；播完 / 退出原生全屏 / 出错 / 点了 6 秒没动就清源收场。治安卓 UC / 夸克 / QQ / 微信把视频拉进原生全屏、玩家关不掉。

## 0.1.0 — 2026-10-06

- 安全区：`pt-safe` / `pb-safe` / `px-safe` / `pb-composer` 和 `--safe-*` 默认值挪进 `styles.css`（作者不用自己写）；`StageBoot` 自动调 `watchViewport()`；`watchViewport` 在 iframe 里先给平台发 `stage:hello`（平台收到再推安全区，不丢第一次），不再接收 `stage:kb`（手机一律全屏输入）。
- `stage.saveSchema(schema)`：改这张卡的存档结构（`PUT /stage/schema`，只认开发凭证 + 卡的作者）。`StageOp` 多了 `'schema'`。
- `StageBoot` / `Splash` 加 `version`：显示在加载页底部。
- ★`readZones` 不再把配图编号 `![](n)` 换成图片地址：编号原样留在分区里，由舞台决定怎么用。新增 helper（`@dianziji/stage`）：`imageRefs`（引用了哪些编号）、`imageUrl`（编号 → 地址，收数字 / `'3'` / `'![](3)'`）、`resolveImages`（需要时自己换成地址）、`stripImages`（去掉）。`readZones` 的第二个参数只需要 `slots`。
- `readLaunch()`（`@dianziji/stage/client`）：线上从平台进入时读舞台地址 `#api=…&token=…`，读完擦掉；`createStage` 没有地址或 token 时不发请求，直接报 `unauthorized`「请从电子姬网站进入这张卡」。
- README 使用教程（三层各怎么用、React 外壳 / 会话引擎 / 客户端的 API、此刻状态、出错、换肤、安全区、测试）。
- 分三层、上层只依赖下层（`test/layers.test.ts` 守着）：新入口 `@dianziji/stage/client` 是纯客户端（`createStage` / `StageError` / `withState` / `splitState` / `decodeToken` / 全部类型，零依赖）；`@dianziji/stage` 是会话引擎（session / saver / 分区 / markdown / 安全区），并把客户端全部再导出；`@dianziji/stage/react` 不变。源码目录 `src/client`、`src/session`、`src/view`、`src/react`。
- 测试和源码一一对应（`test/client|session|view|react/…`），每个模块都有：补了 token、viewport、preload、Splash、toast、shallowEqual、useSaveStatus 和 client 的请求细节；`npm test` 带覆盖率门槛（行 98 / 语句 95 / 函数 95 / 分支 88）。
- 修：存档在路上时页面关了（pagehide / 切后台 / `flush({ keepalive: true })`），等它回来接着发的最新那份没带 keepalive，页面一关可能丢。现在 keepalive 记在存档器上，下一次真正发出去的那份带上。
- `TurnHandlers.onFail` 的参数类型从 `Error` 改成 `StageError`（本来就只会传它）。
- 会话 `createSession`（不依赖 React）：发消息 / 收流 / 出错重说 / 刷新接着收 / 往前翻 / 存档（内置存档器）/ 面板改存档自动同步 / 结算（onTurn，AI 写完那一刻算一次；玩家提前走了不补算；onTurn 抛错不卡）。
- 安全取值 `zoneNum / zoneText / zoneList / zoneData`。
- 按分区订阅：会话每帧最多解析一次分区、内容没变的区稳定引用、记录写完没有 / 最近写过的值 / 正在写哪个区（`state.zones / held / closed / writing`）；React `useZone(id, { hold, complete })`、`useZoneText / useZoneData / useZoneList`、`useWritingZone`；进度 `useTurnProgress()` / `<TurnProgress />`（只看 AI 写到哪个区，不数写完了几个，AI 写完就收起）。会话方法 `zones(raw)` 改名 `readZones(raw)`。
- 测试挪到包里 `test/`（含 jsdom 下的 React 渲染测试：按区订阅的重渲染次数用 Profiler 断言）。
- `send(text)` 原样发，不再自动附加状态；要附「此刻状态」自己用 `withState(话, 状态)`（平台约定的 `<dj_state>`），显示时 `splitState`。
- React：`StageBoot` 接收 `normalize / onTurn / saveDelay`，准备好后建会话；`useStage()` 一个 hook 拿全部（替代原 `useBoot`），`useStage(选择器, shallowEqual?)` 只订阅一部分（官方 use-sync-external-store），`useStageActions()` 只拿方法；`SaveIndicator` / `StageToaster` 在 StageBoot 里不用传参数。
- 配色变量 `--color-sp-*` 挪到这里，面板 / 提示 / 保存按钮共用。

- 首个内部包版本：从脚手架 `src/sdk` + `src/boot` 抽出。
- SDK：`createStage` → `load / send / resume / save / gallery / siteUrl / tokenInfo`；`readZones`、`renderMarkdown`、`watchViewport`、`withState`。
- 快照字段：`site`（签 token 时的网站，拼站内链接）、`dev`（开发 token）、`setup`（初始设定）、history 每条 `created_at / status / spend`。
- 存档器 `createSaver(stage)`：合并连续改动、同一时间只发一个请求、失败转 error 不无限重试、页面关闭 / 切后台用 keepalive 立刻发完；`save(state, { keepalive })`。
- 事件广播 `stage.on(fn)`：`{ type: 'save', state, source }`（存好了；source＝saver / manual / panel / app）、`{ type: 'error', op, error }`（某个操作失败）。存档器订阅它：别处存了就丢掉没发的旧改动。
- React（`@dianziji/stage/react`）：`StageToaster`（SDK 结果自动弹顶部提示）+ `toast()`；`SaveIndicator`（保存指示器 + 手动保存按钮）、`useSaveStatus`；`StageBoot` 启动外壳（看板娘加载页 + 预加载 + 出错重试）、`useBoot`。
