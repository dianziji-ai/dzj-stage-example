# @dianziji/stage

官方维护的版本记录（暂未发布 npm）。★作者开发时不要改这个包：不够用向官方提需求，官方出新版时整个替换。

## 0.1.0 — 2026-10-06

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
