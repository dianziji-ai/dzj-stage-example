# 舞台 SDK：安装、查 API、升级

舞台 SDK 是官方发布在 npm 上的几个包，源码在 [dianziji-ai/dzj-stage-sdk](https://github.com/dianziji-ai/dzj-stage-sdk)。本仓库只是一个**用 SDK 做出来的例子**，SDK 本身不在这里。

## 有哪几个包

| 包 | 干什么 | 必装 | 本手册里的说明 |
|---|---|---|---|
| [`@dianziji/stage`](https://www.npmjs.com/package/@dianziji/stage) | 核心：和网站的桥（快照 / 发一句话 / 存档 / 图册）+ 会话引擎 + React 外壳 | ✅ | [sdk-react](sdk-react.md) · [sdk-session](sdk-session.md) · [sdk-client](sdk-client.md) · [bridge](bridge.md) |
| [`@dianziji/stage-panel`](https://www.npmjs.com/package/@dianziji/stage-panel) | 「本局」面板（概览 / 初始设定 / 图册 / 存档 / 分区 / 指南） | ✅ 每个舞台都要带 | [panel](panel.md) |
| [`@dianziji/stage-settings`](https://www.npmjs.com/package/@dianziji/stage-settings) | 播放设置：文本速度、字号、动效、自动播放 | 可选 | [settings](settings.md) |
| [`@dianziji/stage-voice`](https://www.npmjs.com/package/@dianziji/stage-voice) | 角色配音（要网站支持 `stage.speak`） | 可选 | [voice](voice.md) |
| [`@dianziji/stage-sfx`](https://www.npmjs.com/package/@dianziji/stage-sfx) | 界面音效（现场合成，零素材） | 可选 | [sfx](sfx.md) |

本仓库的 `package.json` 已经全部装好（`npm install` 即可）。从零开始的话：

```bash
npm i @dianziji/stage @dianziji/stage-panel          # 必装
npm i @dianziji/stage-settings                       # 想要播放设置再装
```

样式入口（`src/index.css`）在 `@import 'tailwindcss'` 之后按顺序引：

```css
@import '@dianziji/stage/styles.css';
@import '@dianziji/stage-panel/styles.css';
@import '@dianziji/stage-settings/styles.css';   /* 装了才引；voice 同理 */
```

## 去哪查 API

从近到远：

1. **编辑器里直接看**：鼠标悬停在函数 / 类型上就有中文说明，`F12`（跳转到定义）能看到全部参数和字段——SDK 的类型声明是带注释的。这是最快、也永远和你装的版本一致的地方。
2. **本手册**（`docs/`）：每个包怎么接、为什么这样设计、例子在哪个文件。
3. **包自带的 README / CHANGELOG**：`node_modules/@dianziji/<包名>/README.md`、`CHANGELOG.md`，或者 npm 上的包页面。
4. **源码**：[dzj-stage-sdk](https://github.com/dianziji-ai/dzj-stage-sdk)，`packages/<包名>/src/`。协议的权威定义在 `packages/stage/src/client/protocol.ts`（消息）和 `types.ts`（快照）。

让 AI 帮你开发时，叫它先读本手册，再按需打开 `node_modules/@dianziji/*/dist/*.d.ts` 和 README，**不要凭记忆猜 API**。

## 版本和升级

- 版本号是 `0.x`：**patch**（0.4.0 → 0.4.1）只修 bug、改文档，直接升；**minor**（0.4 → 0.5）有新能力或需要你跟着改的地方，升之前看 CHANGELOG。
- `package.json` 里写的是 `^0.4.0` 这种：`npm install` 会装 0.4.x 里最新的，不会自己跳到 0.5。
- 看有没有新版：`npm outdated`。升级：

```bash
npm update                                # 升到 package.json 范围内最新（安全的 patch）
npm i @dianziji/stage@^0.5.0              # 跨 minor：先看 CHANGELOG，改完跑 npm test、npx tsc -b
```

- 升完照常 `npm test`、`npx tsc -b`、`npm run pack`，在网站里打开本地开发看一遍再上线。
- ★新版本里如果加了新的网站请求（比如 0.4.0 的配音 `stage.speak`），**要网站先支持才能用**——CHANGELOG 里会写明；网站还没上线时，用到它的功能会报「不认识的请求」。

## 不够用怎么办

- **别改 `node_modules/@dianziji/` 里的代码**：重装、升级就被覆盖，别人拉你的仓库也没有。
- 能在自己的 `src/` 里绕开的先绕开（包一层组件、只用 hook 自己画界面、覆盖 CSS 变量）。
- 绕不开的：到 [dzj-stage-sdk 的 Issues](https://github.com/dianziji-ai/dzj-stage-sdk/issues) 提需求，写清楚想做什么、现在卡在哪。
