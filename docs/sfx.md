# 界面音效（`@dianziji/stage-sfx`）

悬停、点击、确认、关闭这些操作的声音反馈。全部用浏览器现场合成，不要音频文件；玩家在播放设置的「音效」一节开关、调音量（默认开、50%）。

## 接进你的舞台

1. `src/App.tsx` 顶层：`useSfxRoot()`——整个舞台里看起来能点的东西都自动有声：鼠标划进去「嘀」、点了「嗒」；开关按点之前的状态响开 / 关。手机没有悬停，只有点击声。
2. 要特别的声音，在元素上写 `data-sfx`：

   | 值 | 声音 | 用在哪 |
   |---|---|---|
   | `confirm` | 往上两音「叮咚」 | 选选项、发送、确定 |
   | `cancel` | 往下两音 | 关闭、取消 |
   | `open` | 「啵」 | 打开面板 / 抽屉 |
   | `page` | 纸声 | 翻到下一句 |
   | `error` / `on` / `off` | 低沉两下 / 开 / 关 | — |
   | `none` | 不响 | 不想要声音的按钮（`data-sfx-hover="none"` 只关悬停） |

3. 不是点出来的声音在代码里放：`sfx('error')`（发送失败）、`sfx('confirm')`。
4. 接了配音（[voice.md](voice.md)）：`useEffect(() => duck(voice.playing), [voice.playing])`，她在念时音效压低一半。
5. 设置面板 `sections` 加上 `'sfx'`。

★不要改 `node_modules/` 里的包。
