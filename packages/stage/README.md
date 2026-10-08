# @dianziji/stage · 舞台 SDK

电子姬舞台的 SDK：客户端（和外层网站之间的桥：快照、发一句话、存档、图册、打开网站工具）+ 会话引擎 + React 外壳。舞台不连后端、没有凭证，协议见 [docs/bridge.md](../../docs/bridge.md)。

> ★**只读**：作者开发时不要改这个目录。不够用向官方提需求；官方出新版时整个 `packages/` 替换。`npm run test:sdk` 会检查有没有被改过。

| 入口 | 是什么 | 文档 |
|---|---|---|
| `@dianziji/stage/react` | React 外壳：`StageBoot`、`useStage`、`useZone…`、现成组件 | [docs/sdk-react.md](../../docs/sdk-react.md) |
| `@dianziji/stage` | 会话引擎：`createSession`、`createSaver`、`readZones`、`renderMarkdown`、`applySafeArea` | [docs/sdk-session.md](../../docs/sdk-session.md) |
| `@dianziji/stage/client` | 客户端：`createStage`、`StageError`、`withState`、全部类型（零依赖） | [docs/sdk-client.md](../../docs/sdk-client.md) |

样式入口：主样式里 `@import 'tailwindcss'` 之后引 `@import '@dianziji/stage/styles.css';`。

## 测试（官方维护用）

```bash
npm test            # 在本包目录；或在例子根目录 npm run test:sdk
```

- `test/` 和 `src/` 一一对应（`src/client/stage.ts` ↔ `test/client/stage.test.ts`），新模块不写测试 `test/layers.test.ts` 会失败；分层依赖也由它守着。
- 带覆盖率跑，有门槛（行 98 / 语句 95 / 函数 95 / 分支 88）。
- 默认 node 环境；要 DOM 的测试文件开头写 `// @vitest-environment jsdom`。

版权见仓库根目录 [LICENSE](../../LICENSE)（专有，非开源）。
