---
name: stage-assets
description: 舞台的素材怎么放：图片 / 视频一律进卡的素材库、不外链；webp；首屏预加载；public/ 路径用 BASE_URL；字体和音效。用到任何图片、视频、音频、字体时用。
---

# 素材

## 规则
1. **立绘、背景、CG、视频一律放卡的素材库**：作者在网站编辑器「素材库」上传，复制素材的地址用。
2. **不许外链任何别的网站**（图床、CDN、Google Fonts…）：别人的链接随时会失效、会被墙，也泄露玩家的访问。
3. 小文件（图标、logo、音效、自托管字体）可以放 `public/` 打进包里；**大图别放 `public/`**（包上限 30MB，而且每次上传都要重传）。

## 地址放哪
- 例子的做法：`src/game/manifest.json` 记素材库地址（按用途分组：`bg`、`sprites`…），`src/game/content.ts` 按 id 取。换成自己的卡，就换这份清单。
- AI 回复里按编号引用的配图：在网站编辑器的「素材库 → 相册」（配图库）里配好，`snap.image_pack` 就是它。**SDK 不会自动把编号换成图**：用 `imageUrl(snap, 编号)` 取地址（数字、`'3'`、`'![](3)'` 都行），其余 helper 见 `docs/sdk-session.md` 的「配图编号」。
- 卡数据里写的 `{{asset}}/卡id/assets/…`：把 `{{asset}}` 换成 `snap.asset_base`。

## `public/` 里的文件
**用 `import.meta.env.BASE_URL` 拼路径**，别写绝对路径：

```ts
const LOGO = `${import.meta.env.BASE_URL}brand/logo.webp`   // ✓
const LOGO = '/brand/logo.webp'                             // ✗ 上传后在 {卡id}/{版本号}/ 下，找不到 → 404
```

`import x from './a.webp'` 这种由 Vite 处理的不用管。

## 格式与大小
- 图片用 **webp**（立绘可带透明）。背景 ~1920 宽够了；手机上不需要 4K 图。
- 动图别用 gif：用 webp 动图或视频。
- 视频：mp4（H.264），竖屏 9:16 最合适。**点了才播**：用 SDK 的 `useTapVideo`（见 `docs/sdk-react.md`），封面另传一张第一帧截图（webp）到素材库当 `<img>` 用。不 `autoPlay + loop`（安卓 UC / 夸克 / QQ / 微信会把它拉进原生全屏，退不出来）。

## 加载
- 首屏要用的图（第一张背景、立绘）交给 `StageBoot` 的 `preload`：解码完才进游戏，第一帧不闪。只放首屏的，别把全部素材都塞进去。
- 其余的图：`loading="lazy" decoding="async"`；切换场景前可以用 `preloadImages([...])` 预先解码下一张。
- 会换的图（立绘、背景、CG）一律用 SDK 的 `<CrossfadeImage>`（见 `docs/sdk-react.md`）：解码完才上屏、交叉淡化，不闪不重影。别自己换 `<img src>`。

## 字体
- 默认用系统字体栈（`src/styles/theme.css` 的 `--font-sans`）。
- 要特殊字体：字体文件放 `public/fonts/`，`@font-face` 自托管，`font-display: swap`；中文字体很大，只用来做标题时先做子集。

## 音频
- 浏览器要求**用户先点一下才准出声**：第一次点击时才创建 `AudioContext` / 才播放（例子：`src/audio/bgm.ts`）。
- 音乐开关记在本机，关着的时候不要创建音频、不要渲染曲子（耗电）。
- 切后台、锁屏时暂停。

## 音乐、封面、角色立绘：先看卡上有没有

- 背景音乐配在卡的「背景音乐」里，舞台读 `snap.bgm`（`{ name, url }`），**别把音频地址写进代码**。按场景换曲：给曲子起能分辨的名字（「白天」「深夜」），代码按名字挑。
- 封面、对话背景、菜单背景读 `snap.card.avatar / background / menu_background`；角色立绘和简介读 `snap.characters`。
- 只有卡上没有的（多表情立绘清单、地图、CG 这些游戏自己的素材）才写进 `manifest.json`。

