import { bgOf } from './art'
import { placeName } from './content'
import { usePack } from './useGame'
import { travelOf, type Travel } from './logic'

/**
 * 行动选项：AI 每轮给 3 条（顺着走 / 追问试探 / 撒娇逗她），点了直接发。
 * ★设计：一条一条的「光带」（galgame 选项），不是带框的卡片——人物能透出来，几条叠着也不挡她：
 *   · 中间深、两头渐隐的夜紫色带子；上沿一道发丝线（粉 / 黄 / 紫轮着来）从中间往两头淡出，下沿一道更淡的，条与条之间留缝；
 *   · 左边一颗同色的菱形小灯，正文最多两行；悬停：发丝线亮起、带子往右轻挪；
 *   · 一条接一条浮进来，跟在心声气泡后面（styles/animations.css）。
 * ★换场（可选的第 4 条，「【前往：cafe】拉着她去吃蛋糕」）：剧情能自然换个地方时 AI 才写，没有就不出。
 *   也是一条光带：金色发丝线，左边一枚小窗露出目的地，「前往 · 地点」+ 那句话；点了发后面那句话（不带【前往：…】）。
 *   地点不在地图里的（travelOf 返回 null），整条丢掉——别把「【前往：火星】」露给玩家。
 * 生成中 / 回看旧的一轮时置灰（不能点）。
 * ★这一轮写完却一条能点的都没有（模型漏写了行动区）：出一条淡一点的光带「暂时没有动作，点击气泡自由发言吧～」，点了就去自己说（onTalk）。
 */
type Tint = { dot: string; line: string }
const TINTS: Tint[] = [
  { dot: 'bg-[#ff7eb6] shadow-[0_0_8px_#ff7eb6]', line: 'via-[#ff7eb6]/75 group-enabled:group-hover:via-[#ff7eb6]' },
  { dot: 'bg-[#ffd23f] shadow-[0_0_8px_#ffd23f]', line: 'via-[#ffd23f]/75 group-enabled:group-hover:via-[#ffd23f]' },
  { dot: 'bg-[#b98cff] shadow-[0_0_8px_#b98cff]', line: 'via-[#b98cff]/75 group-enabled:group-hover:via-[#b98cff]' },
]
const GOLD: Tint = { dot: '', line: 'via-[#ffd23f]/85 group-enabled:group-hover:via-[#ffd23f]' }
const HINT: Tint = { dot: '', line: 'via-white/40 group-enabled:group-hover:via-white/70' }

export default function Choices({ choices, call, busy, onPick, onTalk }: {
  choices: string[]
  /** 她对你的称呼（「主人的房间」里的主人换成它） */
  call: string
  busy: boolean
  onPick: (c: string) => void
  /** 没有选项时点提示：去自己说（手机打开全屏输入，电脑落到下面的输入框） */
  onTalk: () => void
}) {
  const normal = choices.filter((c) => !c.trim().startsWith('【前往'))
  const travel = choices.map(travelOf).find((t): t is Travel => t !== null) ?? null
  if (!normal.length && !travel)
    return busy ? null : (
      <div className="mx-auto mb-2 grid w-full max-w-xl shrink-0 lg:mb-3">
        <Ribbon tint={HINT} delay={300} disabled={false} onClick={onTalk} lead={<span className="shrink-0 text-[15px] leading-none opacity-80">💬</span>}>
          <span className="text-white/75">
            暂时没有动作，<span className="lg:hidden">点击气泡</span>
            <span className="hidden lg:inline">在下面</span>自由发言吧～
          </span>
        </Ribbon>
      </div>
    )
  return (
    <div className="mx-auto mb-2 grid w-full max-w-xl shrink-0 gap-2.5 lg:mb-3 lg:gap-3">
      {normal.map((c, i) => {
        const t = TINTS[i % TINTS.length]
        return (
          <Ribbon key={i} tint={t} delay={300 + i * 80} disabled={busy} onClick={() => onPick(c)} lead={<span className={`size-1.5 shrink-0 rotate-45 rounded-[1px] transition-transform group-enabled:group-hover:scale-150 ${t.dot}`} />}>
            {c}
          </Ribbon>
        )
      })}
      {travel && <TravelChoice travel={travel} call={call} disabled={busy} delay={300 + normal.length * 80} onPick={() => onPick(travel.text)} />}
    </div>
  )
}

/** 一条光带：中间深两头渐隐，上下两道发丝线；lead＝左边的小灯 / 小窗 */
function Ribbon({ tint, delay, disabled, onClick, lead, children }: { tint: Tint; delay: number; disabled: boolean; onClick: () => void; lead: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ animationDelay: `${delay}ms` }}
      className="group relative flex w-full animate-rise-in items-center gap-3 bg-[linear-gradient(90deg,transparent,rgb(36_14_54/0.72)_10%,rgb(36_14_54/0.72)_90%,transparent)] px-5 py-2 text-left transition-transform duration-300 enabled:hover:translate-x-1 enabled:active:scale-[0.99] disabled:opacity-45 lg:px-8 lg:py-2.5"
    >
      <span className={`pointer-events-none absolute inset-x-[6%] top-0 h-px bg-gradient-to-r from-transparent to-transparent transition-colors ${tint.line}`} />
      <span className={`pointer-events-none absolute inset-x-[18%] bottom-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-40 transition-colors ${tint.line}`} />
      {lead}
      <span className="line-clamp-2 min-w-0 flex-1 text-[13.5px] leading-[1.5] text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.6)] lg:text-[15px]">{children}</span>
      <span className="shrink-0 text-xs text-white/35 transition-transform group-enabled:group-hover:translate-x-0.5 group-enabled:group-hover:text-[#ffd23f]">›</span>
    </button>
  )
}

/** 换场：金色光带，左边一枚小窗露出目的地，「前往 · 地点」+ 那句话 */
function TravelChoice({ travel, call, disabled, delay, onPick }: { travel: Travel; call: string; disabled: boolean; delay: number; onPick: () => void }) {
  const pack = usePack()
  const thumb = (
    <span className="relative h-7 w-10 shrink-0 overflow-hidden rounded-[5px] bg-[#1b0f2a] shadow-[0_0_0_1px_rgb(255_210_63/0.65),0_0_10px_rgb(255_210_63/0.22)] lg:h-8 lg:w-11">
      <img src={bgOf(pack, travel.place)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-enabled:group-hover:scale-110" />
    </span>
  )
  return (
    <Ribbon tint={GOLD} delay={delay} disabled={disabled} onClick={onPick} lead={thumb}>
      <span className="mr-1.5 text-[12px] font-bold text-[#ffe58a] lg:text-[13px]">前往 · {placeName(travel.place, call)}</span>
      {travel.text}
    </Ribbon>
  )
}
