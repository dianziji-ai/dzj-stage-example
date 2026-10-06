# 开发手册

| 篇 | 讲什么 |
|---|---|
| [getting-started.md](getting-started.md) | 上手：准备卡 → 拿开发凭证 → `npm run dev` → 改成你自己的卡 |
| [example-card.md](example-card.md) | 官方例子卡：8 个分区、存档结构、开场、素材——想看到例子的效果先照它建卡 |
| [deploy.md](deploy.md) | 上线：`npm run pack`、上传、玩家怎么进来、凭证安全、路径、上传前自检 |
| [mobile.md](mobile.md) | 电脑 / 手机：断点、安全区、键盘、输入、布局、验收尺寸 |
| [state.md](state.md) | 存档结构（JSON Schema）、每轮怎么改存档（onTurn）、附给 AI 的「此刻状态」 |
| [sdk-react.md](sdk-react.md) | React 外壳：`StageBoot`、`useStage`、按分区订阅、现成组件 |
| [sdk-session.md](sdk-session.md) | 会话引擎：`createSession`、存档器、分区解析、markdown |
| [sdk-client.md](sdk-client.md) | 客户端：SDK 分三层、`createStage`、`readLaunch`、事件 |
| [panel.md](panel.md) | 本局面板：用法、参数、六个标签、换肤 |
| [api.md](api.md) | HTTP 接口全文：鉴权、读这一局 / 发一句话 / 收流 / 存档 / 图册、限流 |
| [errors.md](errors.md) | 错误码：什么时候出现、该给玩家什么 |

用 AI 开发？先让它读根目录的 [AGENTS.md](../AGENTS.md)。
