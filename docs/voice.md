# 角色配音（`@dianziji/stage-voice`）

作者在网站编辑器「角色包」里给角色配了声音（声音库在网站的「声音工坊」），舞台就能把这个角色的台词念出来。合成、计费、缓存都在网站：舞台只说「谁说了什么」，拿回音频地址自己播。

## 规则（模块定死，所有舞台一样）

- **默认关**，玩家自己开：按字数扣**玩家**的能量；同一句、同一种情绪再念不扣（网站有缓存，换设备也命中）。
- **先检查再请求**，不过检查的句子不请求、不扣钱：
  - 角色没配声音 → 不念；
  - 清洗后（去掉【动作】（神态）*旁白*、表情符号、markdown）不到 2 个字 → 不念；
  - 一句超过「一句最多念」（默认 80 字）→ 不念：模型抽风把一大段塞进台词时不白扣；
  - 这一轮累计超过「一轮最多念」（默认 300 字，可选不限）→ 那句和后面的都不念；
  - **AI 还在写**：最后一句可能只写了半截，等后面出现新的一句或这一轮写完再念。
- **同时只请求一句**，排队往前看：从当前这句往后、最近 2 句要念的台词按顺序一句一句取——玩家看旁白的时候，后面的台词已经在后台取好了。最多领先 2 句（提前取的也扣钱，玩家重生成或跳走就白花）。翻页、暂停、离开页面立刻停。
- **出错一次就停**：网络、能量不够、限流、内容被拦，任何一次失败都把配音关掉，提示一句；玩家自己再打开。没配声音不算出错。
- **玩家自己跳过就暂停**：她还在念（或还在取）的时候玩家自己翻页 → 停掉、配音暂停（不再取不再念），点配音按钮接着念；只在这次打开里，不改设置。已经念完再翻＝正常往下读；点一下补完打字、自动播放翻页都不算。舞台在手动翻页里调 `voice.interrupt()`。
- **单句喇叭**：台词旁一直放一个小喇叭，按 `voice.lineState` 画四种样子——`ready` 生成过（点了 `voice.replay()` 直接播、不扣钱）/ `idle` 还没生成（先问玩家，确认后 `voice.speakNow()` 生成并播放，扣钱）/ `loading` 生成中 / `blocked` 不能念（原因看 `voice.skip`）。单句是玩家自己点的：不看配音开关和暂停，出错只提示、不关配音。`voice.playing` 给喇叭做动效。
- **跟自动播放联动**：这句要念＝等她念完、再停一个句末停顿就翻；不念的句子照旧按字数等。
- 设置（开关、音量、一句上限、一轮上限）在播放设置面板的「配音」一节，存玩家本机。

## 只要单句（不自动配音）

`useVoice({ …, auto: false })`：不自动念、不预取，设置里的配音开关不管用；只有玩家点了台词旁的小喇叭才生成 / 播放（`lineState` / `speakNow` / `replay`）。标题栏不用放 `VoiceButton`、设置面板不用加 `'voice'`。自动播放写 `ready: tw.done && !voice.playing`，点了念的那句不会被翻页切掉。人多时阿里按整个账号限流（每个模型每分钟 180 次），自动配音撑不住，柳月儿舞台目前就是这种用法。

## 接进你的舞台

1. `src/index.css`：`@import '@dianziji/stage-voice/styles.css';`
2. 对话框里（`useAutoPlay` 之前）：
   ```ts
   const { stage } = useStageActions()
   const lines = useMemo(() => beats.map((b) => b.who ? { who: b.who, text: b.text, emotion: b.mood } : { who: '', text: '' }), [beats])
   const voice = useVoice({ stage, lines, index: idx, streaming: busy, paused })
   const auto = useAutoPlay({ text: voice.voiced ? '' : beat.text, ready: tw.done && !voice.busy, canAdvance, onNext, paused })
   useEffect(() => { if (voice.notice) { toast(voice.notice, 'error'); voice.dismiss() } }, [voice])
   ```
   手动翻页（点对话框、上一句 / 下一句按钮）先调 `voice.interrupt()` 再翻；自动播放的 `onNext` 不调。
   ★`streaming` 只在你的句子列表**会包含还在写的半截句**时才传；如果你已经只给写完的句子（像柳月儿的 completedBeats），别传——传了最后一句写完的也会被当成没写完，生成中不念不预取。
   `lines` 和对话框的句子一一对应：不是角色台词的位置（旁白、玩家说的）给 `{ who: '', text: '' }` 占位。`paused` 跟自动播放同一套「玩家在干别的」。
3. 标题栏：`<VoiceButton voice={voice} />`（关 / 开 / 取声音转圈 / 念的时候声波动 / 出错红点），设置面板 `sections` 里加上 `'voice'`。
   柳月儿舞台的写法：「▶ 自动」「🔊 配音」「⚙ 设置」三颗并排（`src/game/PlayControl.tsx`）。

## 换样子

覆盖 `.dzj-vc` 的三个变量（`--dzj-vc-on` 开着的颜色、`--dzj-vc-fg` 平时的颜色、`--dzj-vc-alert` 出错红点），`className` 调尺寸；或者只用 `useVoice` 自己画按钮（`voice.state` / `voice.on` / `voice.toggle()`）。★不要改 `packages/stage-voice/`。

## 要网站配合

`stage.speak` 是 SDK 0.4.0 加的请求：**网站要先上线**，老网站会回「不认识的请求」——`useVoice` 会把它当成出错、关掉配音，不会卡住舞台。
