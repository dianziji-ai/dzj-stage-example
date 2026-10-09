# @dianziji/stage-autoplay

舞台的**自动播放**：一句一句播的对话，到点自动翻下一句。独立模块，**只依赖 react**（不依赖舞台 SDK、不碰平台），哪个舞台想要就接，不接的完全不受影响。

## 等多久

`等多久 ＝ 句末停顿 + 字数 × 每字停留`，最多 12 秒。字数只数要读的字（空白、标点不算）。
默认每字 90 毫秒、句末 1.5 秒：一句 30 字约 4.2 秒。玩家自己在设置里调，存在本机（每张卡各记各的）。

**什么时候不翻**（这几条是模块定死的行为，所有舞台一样）：
- 读到最后一句（选项出来了）——绝不替玩家选；
- AI 还在写、已经播到最新一句——等下一句写出来再接着播；
- 舞台说要暂停（`paused`：开着输入框 / 弹窗、在回看旧的一轮、对话框藏起来……）；
- 页面切到后台。

玩家自己点了下一句：文字变了，自动从头计时。

## 三样东西

| 用什么 | 是什么 |
|---|---|
| `useAutoPlay({ text, canAdvance, onNext, paused })` | **计时**（核心）：到点调 `onNext`。返回 `{ on, toggle, running, duration, cycle }` 给界面用 |
| `<AutoPlayButton state={…} onSettings={…} />` | 现成的开关（可选）：低调的「▶ 自动」，开着时下面一道发丝线从左往右长，长满就翻；`onSettings` 给了就多一个「调节」小图标 |
| `<AutoPlaySettings />` | 现成的设置（可选）：开关 + 每字停留 / 句末停顿两条滑杆 + 预览「一句 30 字约停几秒」 |

还有纯函数 `delayFor` / `countChars`、设置 store `autoPlayStore` / `createAutoPlayStore`、`useAutoPlayPrefs`，见 `src/index.ts`。

## 怎么接

```tsx
import { useAutoPlay, AutoPlayButton, AutoPlaySettings } from '@dianziji/stage-autoplay'
// 样式入口（src/index.css）：@import '@dianziji/stage-autoplay/styles.css';

const auto = useAutoPlay({
  text: 这一句的文字,
  canAdvance: idx < last,          // 后面还有下一句（最后一句 / 还没写出来时传 false）
  onNext: () => go(idx + 1),       // 舞台自己的翻页
  paused: 输入框开着 || 在回看 || 对话框藏着 || 出错了,
})

<AutoPlayButton state={auto} onSettings={() => 打开设置浮层} />
<AutoPlaySettings />               // 放进设置浮层 / 菜单 / 设置页，放哪舞台定
```

★`useAutoPlay` 要在组件提前 `return` 之前调用（hooks 规矩）；对话框藏起来时用 `paused` 停，别不调用。

## 界面是舞台自己的：改到什么程度都行

模块的 `packages/` 代码别改（只读），界面靠这三档改：

1. **换颜色**：在自己的样式里覆盖四个变量
   ```css
   .dzj-ap.my-skin, .dzj-ap-settings.my-skin {
     --dzj-ap-accent: #ff7eb6;               /* 主题色：图标、发丝线、滑杆、开关 */
     --dzj-ap-track: rgb(255 255 255 / .2);  /* 轨道、关着的开关 */
     --dzj-ap-fg: #fff;                      /* 开着时的字 */
     --dzj-ap-muted: rgb(255 255 255 / .6);  /* 关着时的字 */
   }
   ```
   然后 `<AutoPlayButton className="my-skin" />`、`<AutoPlaySettings className="my-skin" />`。
2. **改尺寸 / 窄屏只留图标**：`className` 加尺寸；加 `dzj-ap-iconic` 就不显示「自动」两个字（或自己写媒体查询藏 `.dzj-ap-label`）。
3. **整个换掉**：不用 `<AutoPlayButton>`，只用 `useAutoPlay` 给的值自己画——`running` 时放一个时长为 `duration` 毫秒的动画、`key={cycle}` 让每句从头播（环、进度条、沙漏都行）；`toggle` 开关。设置面板同理，用 `useAutoPlayPrefs()` 读写。

## 官方例子 / 柳月儿的接法

- 计时：`src/game/Dialogue.tsx` 里一行 `useAutoPlay(...)`；
- 界面：`src/game/AutoPlayControl.tsx`（标题栏的开关 + 「调节」点开的设置浮层，点外面 / Esc 收起）；
- 配色：`src/styles/surfaces.css` 末尾一段变量覆盖（例子是电子姬粉、柳月儿是玫红；柳月儿手机上只留图标）。

## 测试

`npm test -w @dianziji/stage-autoplay`：每个源文件一份测试（计时用假时钟：到点翻、最后一句等、暂停 / 后台 / 换句从头计时、onNext 换了不重计时），外加结构守卫（只许依赖 react）。
