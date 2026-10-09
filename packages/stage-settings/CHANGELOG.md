# @dianziji/stage-settings

官方维护的版本记录（暂未发布 npm）。★作者开发时不要改这个包：不够用向官方提需求，官方出新版时整个替换。

## 0.1.0 — 2026-10-09

首个版本：舞台的播放设置（独立模块，只依赖 react）。由刚做的 stage-autoplay 并进来扩成一整套（那个名字没发布过，不留）。

- 一份设置五项：文本速度（慢 / 标准 / 快 / 瞬间，每秒 14 / 30 / 70 字）、字号（小 / 标准 / 大）、动效（标准 / 减少）、选项行为（填入确认 / 直接发送）、自动播放（开关 + 每字停留 + 句末停顿）。默认值照柳月儿原卡（魅魔岛 mma）的设置。
- `useTypewriter`：逐字打出、点一下补完、生成中同一句变长接着打、单帧最多 80ms。
- `useAutoPlay`：字打完（`ready`）才计时；最后一句 / 还没有下一句原地等；暂停、后台、换句从头计时。
- `useSettingsRoot`：字号 / 动效写到 `<html>`（`--dzj-font-scale`、`data-dzj-font`、`data-dzj-motion`）。
- `fillChoice`：填入模式按顺序叠加、不重复、手改过就从头叠。
- `<SettingsPanel>`（可选 sections）、`<AutoPlayButton>`（低调「▶ 自动」+ 发丝线倒计时 +「调节」）。
- 设置存玩家本机（`createSettingsStore` / `settingsStore`），读写失败照常可用。
