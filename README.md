# 电子姬舞台 · 官方例子

一张完整的舞台卡（galgame「电子姬的同居日常」，卡 `dzj-stage-example`）+ 舞台 SDK。
**从这里起步**：跑起来看它能做到什么，再把游戏换成你自己的。

React 19 + Vite + Tailwind CSS v4。电脑、手机都适配（只做竖屏）。

> 舞台＝一张卡的画面：AI 照常按卡的提示词和分区写剧情，舞台把分区渲染成画面，聊天、存档、计费都走电子姬平台。舞台是网站页面里的一个 iframe，和网站之间只靠 postMessage 说话（[舞台桥](docs/bridge.md)），不连后端、没有凭证。

## 三分钟跑起来

1. ```bash
   npm install
   npm run dev
   ```
2. 网站上进入你的卡（新游戏走完开场），工具行 **「开发」→ 本地开发**，填 `http://localhost:5173` 开启。
3. 网站里这张卡的舞台就换成了你本机的页面，改代码立刻热更新。聊天、存档、换模型、MOD 都是网站真实那一套。（只认本机地址；直接打开 localhost 会提示「请在网站里打开」。）

> ★例子的代码是照着官方例子卡的分区和存档结构写的。用自己的卡跑，先照 [官方例子卡](docs/example-card.md) 建好 8 个分区、把 `src/game/state.schema.json` 粘进编辑器「舞台 → ② 存档结构」，不然对话框是空的。上线：`npm run pack` 生成 `stage.zip`；目前由平台管理员上传（把 zip 和卡 id 发给管理员），见 [上线](docs/deploy.md)。

## 目录

**开发手册（[docs/](docs/README.md)）**

- [上手](docs/getting-started.md)：准备卡、在网站里打开本机页面、改成你自己的卡、项目结构
- [官方例子卡](docs/example-card.md)：例子对应的 8 个分区和存档结构，想看到例子的效果先照它建
- [上线](docs/deploy.md)：打包上传、玩家怎么进来、★路径、自检清单
- [电脑 / 手机](docs/mobile.md)：断点、安全区、键盘、布局
- [存档与此刻状态](docs/state.md)：存档结构、onTurn 结算、附给 AI 的状态
- SDK：[React 外壳](docs/sdk-react.md) · [会话引擎](docs/sdk-session.md) · [客户端](docs/sdk-client.md) · [本局面板](docs/panel.md)
- [舞台桥（postMessage 协议）](docs/bridge.md) · [错误码](docs/errors.md)

**用 AI 开发**

- [AGENTS.md](AGENTS.md)：给 AI 的总规则（开工流程、铁律、技能索引）。Claude Code 读 `CLAUDE.md`（就是引用它）。
- [.claude/skills/](.claude/skills)：分主题的开发技能（流程、React、适配、素材、性能、游戏逻辑、播放设置、上线、踩过的坑）。

## 项目结构

```
packages/        舞台 SDK（★只读，不要改；官方升级时整个替换）
src/             你的游戏（只改这里和 public/）
docs/            开发手册
.claude/skills/  AI 开发技能
AGENTS.md        AI 总规则
```

## 命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地开发（在网站里打开：工具行「开发」→ 本地开发） |
| `npm test` | 游戏自己的测试 |
| `npm run test:sdk` | SDK 的测试 + 检查 `packages/` 有没有被改过 |
| `npm run lint` | 代码检查 |
| `npm run pack` | 打包成 `stage.zip`（加载页底部显示构建号 `BUILD 时间戳`）。注意是 `npm run pack`，不是 npm 自带的 `npm pack` |

## 版权

本仓库（官方例子、`@dianziji/stage`、`@dianziji/stage-panel`、`@dianziji/stage-settings`、舞台协议与文档、美术与音频素材）是电子姬的**专有软件，不是开源软件**。
只允许用来给电子姬平台上的卡开发舞台、并在电子姬平台发布；不得用于其他网站或产品，不得再分发、转售，不得照着舞台协议给别的平台做兼容实现。详见 [LICENSE](LICENSE)。
