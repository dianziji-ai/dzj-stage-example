# @dianziji/stage-settings

舞台的**播放设置**：一份设置、一个面板，管五样——文本速度（逐字打出）、字号、动效、选项行为、自动播放。
独立模块，**只依赖 react**（不依赖舞台 SDK、不碰平台），哪个舞台想要就接，不接的完全不受影响。设置存玩家本机（每张卡各记各的），不进存档。

## 五项设置

| 设置 | 选项（默认加粗） | 效果 |
|---|---|---|
| 文本速度 | 慢 / **标准** / 快 / 瞬间 | 对话逐字打出，每秒 14 / 30 / 70 字，瞬间＝整句直接出；打字中点一下先补完这句，再点才翻页 |
| 字号 | 小 / **标准** / 大 | `--dzj-font-scale` ＝ 0.88 / 1 / 1.2，舞台的对话字号乘它 |
| 动效 | **标准** / 减少 | 「减少」＝和系统「减少动态效果」一样，把动画、过渡压到几乎为零 |
| 选项行为 | **填入确认** / 直接发送 | 填入：点选项把文字写进输入框，确认后再发；连点几个按顺序一行一条叠加、同一条不重复，玩家手改过输入框就从头叠 |
| 自动播放 | 开关（默认关）+ 每字停留 90ms（20–250）+ 句末停顿 1.5 秒（0–5） | 字打完后等 `句末停顿 + 字数 × 每字停留`（最多 12 秒，空白标点不算字）再翻下一句 |

自动播放**不翻**的时候（模块定死）：最后一句（选项出来了，绝不替玩家选）；AI 还没写出下一句（等它写出来再接着播）；字还没打完；舞台说暂停；页面在后台。

## 怎么接

```tsx
import { useSettingsRoot, useTypewriter, useAutoPlay, useSettings, fillChoice, AutoPlayButton, SettingsPanel } from '@dianziji/stage-settings'
// 样式入口（src/index.css）：@import '@dianziji/stage-settings/styles.css';

// App 顶层调一次：字号 / 动效写到 <html> 上
useSettingsRoot()

// 对话框里（都在任何提前 return 之前）
const tw = useTypewriter(这一句的文字)               // tw.shown 显示的那一截、tw.done、tw.finish()
const next = () => (tw.done ? 翻下一句() : tw.finish())
const auto = useAutoPlay({
  text: 这一句的文字,
  canAdvance: idx < last,                             // 后面还有下一句
  onNext: 翻下一句,
  ready: tw.done,                                     // 字打完才开始计时
  paused: 不在游玩页 || 输入框开着 || 在回看 || 对话框藏着 || 出错了,
})
const [settings] = useSettings()
const pick = (c) => settings.choiceMode === 'send' ? 直接发(c) : 用 fillChoice(输入框, 已叠的, c) 填进输入框

<p className="text-[calc(15px*var(--dzj-font-scale,1))]">{tw.shown}</p>
<AutoPlayButton state={auto} onSettings={打开浮层} />   // 低调的「▶ 自动」+「调节」
<SettingsPanel />                                      // 浮层里放整个面板；sections 可只显示几节
```

## 界面是舞台自己的

模块代码别改（`packages/` 只读）。界面三档改法：
1. **换颜色**：覆盖 `--dzj-ap-accent / --dzj-ap-track / --dzj-ap-fg / --dzj-ap-muted`（`.dzj-ap.你的类, .dzj-ap-settings.你的类 { … }`），再给组件传 `className`。
2. **尺寸 / 窄屏只留图标**：`className` 加尺寸；`dzj-ap-iconic` 或媒体查询藏 `.dzj-ap-label`。
3. **整个换掉**：只用 hook——`useAutoPlay` 给 `on / toggle / running / duration / cycle`（倒计时动画用 `duration` 毫秒、`key={cycle}`），`useSettings()` 读写全部设置，自己画按钮和面板。`<SettingsPanel sections={['text','auto']} />` 可以只显示舞台支持的几节。

## 官方例子 / 柳月儿的接法

- `src/App.tsx`：`useSettingsRoot()`；
- `src/game/Dialogue.tsx`：`useTypewriter` + `useAutoPlay` + 选项 `pick`（填入 / 直接发）；对话字号 `calc(…*var(--dzj-font-scale,1))`；
- `src/game/PlayControl.tsx`：标题栏「▶ 自动」+「调节」点开 `<SettingsPanel />`（点外面 / Esc 收起）；
- `src/styles/surfaces.css` 末尾：四个颜色变量。

## 测试

`npm test -w @dianziji/stage-settings`：每个源文件一份测试（打字机用假动画帧、自动播放用假时钟：到点翻、最后一句等、没打完不计时、暂停 / 后台 / 换句从头计时；store 读写失败照常可用；面板五项都能调），外加结构守卫（只许依赖 react）。
