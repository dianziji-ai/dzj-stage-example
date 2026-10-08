# @dianziji/stage-panel · 本局面板

每个舞台都带的「本局」面板：概览、初始设定、历史和每轮消耗、图册、存档、分区、指南（换模型 / MOD / 记忆 / 改删回溯记录去网站哪里做）。**上线也给玩家看。**

> ★**只读**：作者开发时不要改这个目录。用参数和配色变量定制；不够用向官方提需求。

用法、参数、七个标签、全部配色变量（含深色写法）：[docs/panel.md](../../docs/panel.md)。

```tsx
import { StagePanel, openStagePanel } from '@dianziji/stage-panel'
<StagePanel stage={stage} button={false} />   // 入口放进自己的菜单，调 openStagePanel()
```

## 测试（官方维护用）

```bash
npm test            # 在本包目录；或在例子根目录 npm run test:sdk
```

`test/` 和 `src/` 一一对应，`test/structure.test.ts` 守着「只依赖 react 和 SDK」「每个模块都有测试」；带覆盖率门槛。

版权见仓库根目录 [LICENSE](../../LICENSE)（专有，非开源）。
