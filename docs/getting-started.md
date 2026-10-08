# 上手

从官方例子起步：先跑起来看它能做到什么，再把游戏换成你自己的。

## 1. 准备一张卡

舞台不是独立的游戏，而是**一张卡的画面**：AI 照常按卡的提示词和分区写剧情，舞台把分区渲染成画面。所以先在网站上有一张卡：

- 卡的**分区**定好（正文、表情、场景、选项…），舞台按区渲染。
- **定义游戏状态**：要存游戏数据的（好感、金币、背包、进度…），先在编辑器「舞台 → ② 存档结构」写好存档结构并保存，再写存档代码（见 [state.md](state.md#存档结构)）。不定义就不能存档。
- 立绘、背景、CG 都传到**卡的素材库**（编辑器里上传），舞台引用素材库的地址。

## 2. 跑起来：在网站里加载你本机的页面

> ★例子的代码是照着官方例子卡（`dzj-stage-example`）写的：**分区 id 和存档字段都要对上**。用自己的卡想先看到例子的效果，照 [example-card.md](example-card.md) 在卡里建好 8 个分区、粘好存档结构、填开场。

```bash
npm install
npm run dev        # 记下终端打印的地址，默认 http://localhost:5173
```

1. 网站上进入你的卡（舞台模式），**新游戏**走完初始设定和开场。
2. 工具行「开发」→ **本地开发**，填上面那个地址 → 开启。只认本机地址（`localhost` / `127.0.0.1` / `[::1]`），按卡记在这个浏览器里。
3. 网站里这张卡的舞台 iframe 就改加载你本机的页面，和线上走同一座桥（[bridge.md](bridge.md)）：改代码立刻热更新；聊天、扣费、存档、换模型、MOD、记忆都是网站真实那一套。舞台没有凭证，不用 `.env`，也没有要配置的东西。

★别直接在浏览器里打开 `localhost`：舞台等不到网站推来的快照，3 秒后加载页显示「请在网站里打开」。

只对你这个浏览器、这张卡生效，玩家看到的永远是线上版本；关掉同一个开关就回到线上版本。用 Chrome / Edge / Firefox（Safari 可能拦住 https 页面里的 `http://localhost`）。

```bash
npm test           # 游戏自己的测试（src/**/*.test.ts）
npm run test:sdk   # SDK 的测试（只读，不用管，官方维护）
npm run lint
```

## 3. 改成你自己的卡

只改 `src/` 和 `public/`。**`packages/`（SDK）是只读的，不要改**：不够用就向官方提需求。

| 想改什么 | 改哪里 |
|---|---|
| 地点、表情、素材地址 | `src/game/content.ts`、`src/game/manifest.json` |
| 存档里有什么、每轮怎么变 | `src/game/logic.ts`（`GameSave` / `nextSave`）+ `src/game/rules.ts`；网站编辑器的存档结构要对上 |
| 每句话附给 AI 的状态 | `src/game/logic.ts` 的 `stateForAi` |
| 画面 | `src/game/` 下的组件；分区 id（`scene` / `face` / `narrative` …）要和你卡里定义的对上 |
| 样式 | Tailwind 类名写在组件上；全局的放 `src/styles/`；组件专属的复杂样式用 `组件名.module.css` |
| 不要的玩法 | 抓娃娃：删 `src/claw/` 之后还要改这几处（它们引用了抓娃娃的数据）：`game/logic.ts`（`GameSave.claw`、`stateForAi` 的抓娃娃一行、`START_COINS` 等）、`game/pages/GalleryPage.tsx`（娃娃收藏柜）、`game/Hud.tsx`（硬币）、`App.tsx`（入口、送娃娃、`clawCta`）、`game/logic.test.ts`，存档结构里的 `claw` 字段也删掉，再粘进编辑器「舞台 → ② 存档结构」。音乐：删 `src/audio/` 和 `App.tsx` 里的 `useBgm` / 音乐按钮。删完跑 `npx tsc -b`，报错的地方就是还要改的 |

## 目录

```
packages/                     舞台 SDK（只读）
  stage/        @dianziji/stage        客户端 / 会话引擎 / React 外壳
  stage-panel/  @dianziji/stage-panel  「本局」面板
src/                          你的游戏
  main.tsx      启动：<StageBoot> + 首屏预加载 + 游戏规则
  stage.ts      舞台连接：一行 createStage()（和外层网站之间的桥，别改）
  App.tsx       页面组装
  index.css     样式入口（只做引入）
  styles/       全局样式：配色、安全区、动画、质感、markdown、面板换肤
  game/         这张卡的游戏：内容、规则、界面组件
  claw/         抓娃娃机（这张卡专属的小游戏，演示「舞台里能放任何玩法」）
  audio/        8-bit BGM + 音效
docs/                         开发手册（就是这里）
.claude/skills/               给 AI 用的开发技能（见根目录 AGENTS.md）
```

## 写舞台的三步

```tsx
// ① main.tsx：启动外壳。等网站给这一局的快照、预加载、建好会话；游戏规则从这里传进去
<StageBoot stage={stage} preload={(snap) => [背景图]} normalize={补默认值} onTurn={每轮怎么改存档}>
  <App />
</StageBoot>

// ② 组件里按分区订阅：只有用到「正在变的那个区」的组件更新
const body = useZoneText('narrative')
const face = useZoneData('face', { hold: true, complete: true })
const { send } = useStageActions()

// ③ 现成组件
<StagePanel stage={stage} />  <StageToaster />  <SaveIndicator />  <TurnProgress />
```

详细见 [sdk-react.md](sdk-react.md)。做完了上线见 [deploy.md](deploy.md)。
