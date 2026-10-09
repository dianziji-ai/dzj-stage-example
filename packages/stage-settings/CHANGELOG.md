# @dianziji/stage-settings

官方维护的版本记录（暂未发布 npm）。★作者开发时不要改这个包：不够用向官方提需求，官方出新版时整个替换。

## 0.2.0 — 2026-10-09

- 新增「配音」设置（给 `@dianziji/stage-voice` 用）：`voice: { on, volume, maxLine, maxTurn }`，默认关、音量 80、一句最多 80 字、一轮最多 300 字（0＝不限）。读回来不认识的值夹回默认。
- `<SettingsPanel>` 多一节 `voice`。★不在默认 sections 里：只有接了配音的舞台才在 `sections` 里写上，别的舞台面板不变。
- `SettingsPatch` 的 `voice` 可以只给要改的那几项（同 `autoPlay`）。
- ★面板简化（站长：「看着太复杂」）：动效改成「减少动画」开关；自动播放的两条滑杆换成「翻页节奏 慢 / 标准 / 快」（`PACES`、`paceOf`，选一档同时定每字停留和句末停顿；关着自动播放不显示）；开着配音时不显示节奏，改成一句「她念完这句就翻下一句」；配音只给开关，开了才出音量 + 一句 / 一轮最多念（站长要回来了）。
- 新增「音效」设置（给 `@dianziji/stage-sfx` 用）：`sfx: { on, volume }`，默认开、音量 50；面板多一节 `sfx`（开关，开了才出音量），同样不在默认 sections 里。设置数据结构没变。

## 0.1.0 — 2026-10-09

首个版本：舞台的播放设置（独立模块，只依赖 react）。由刚做的 stage-autoplay 并进来扩成一整套（那个名字没发布过，不留）。

- 一份设置五项：文本速度（慢 / 标准 / 快 / 瞬间，每秒 14 / 30 / 70 字）、字号（小 / 标准 / 大）、动效（标准 / 减少）、选项行为（填入确认 / 直接发送）、自动播放（开关 + 每字停留 + 句末停顿）。默认值照柳月儿原卡（魅魔岛 mma）的设置。
- `useTypewriter`：逐字打出、点一下补完、生成中同一句变长接着打、单帧最多 80ms。
- `useAutoPlay`：字打完（`ready`）才计时；最后一句 / 还没有下一句原地等；暂停、后台、换句从头计时。
- `useSettingsRoot`：字号 / 动效写到 `<html>`（`--dzj-font-scale`、`data-dzj-font`、`data-dzj-motion`）。
- `fillChoice`：填入模式按顺序叠加、不重复、手改过就从头叠。
- `<SettingsPanel>`（可选 sections）、`<AutoPlayButton>`（低调「▶ 自动」+ 发丝线倒计时 +「调节」）。
- 设置存玩家本机（`createSettingsStore` / `settingsStore`），读写失败照常可用。
