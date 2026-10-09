# @dianziji/stage-sfx

官方维护的版本记录（暂未发布 npm）。★作者开发时不要改这个包：不够用向官方提需求，官方出新版时整个替换。

## 0.1.0 — 2026-10-09

首个版本：舞台的界面音效，WebAudio 现场合成（零音频文件、零网络请求）。

- 九个声音：悬停（柔和的正弦轻触，C6 往下滑、过低通——第一版高音钟片太刺耳已换掉）、点击（木质「嗒」）、确认（往上两音「叮咚」）、取消 / 关闭（往下两音）、打开（「啵」）、开关打开 / 关上、翻页（纸声）、出错（低沉两下）。钟片音色（正弦 + 略失谐高泛音）、柔化低通、一点合成混响，每次随机偏一点音高不腻耳。
- `useSfxRoot()`：App 顶层调一次，看起来能点的（button、链接、role=button…、或鼠标是小手 cursor:pointer 的）自动有声；手机没有悬停；同一元素只响一次，悬停限流。
- `data-sfx="confirm|cancel|open|page|error|on|off|none"` 指定声音；开关（复选框、role=switch、aria-pressed）自动按点之前的状态响开 / 关。
- `sfx(name)` 代码里放；`duck(on)` 配音在念时压低一半。
- 设置在 `@dianziji/stage-settings` 0.2.0 的 `sfx`（默认开、音量 50），面板 `sections` 加 `'sfx'`。
