import { bgOf } from './art'
import { placeName } from './content'
import { usePack } from './useGame'
import { travelOf, type Travel } from './logic'

/**
 * 行动选项：AI 每轮给 3 条（顺着走 / 追问试探 / 撒娇逗她），点了直接发。
 * ★换场（可选的第 4 条，「【前往：cafe】拉着她去吃蛋糕」）：剧情能自然换个地方时 AI 才写，没有就不出。
 *   单独一种样子：左边一扇「门」露出目的地那张背景，写着「换场 · 去哪」；点了发后面那句话（不带【前往：…】）。
 *   地点不在地图里的（travelOf 返回 null），整条丢掉——别把「【前往：火星】」露给玩家。
 * 生成中 / 回看旧的一轮时置灰（不能点）。
 */
export default function Choices({ choices, call, busy, onPick }: {
  choices: string[]
  /** 她对你的称呼（「主人的房间」里的主人换成它） */
  call: string
  busy: boolean
  onPick: (c: string) => void
}) {
  const normal = choices.filter((c) => !c.trim().startsWith('【前往'))
  const travel = choices.map(travelOf).find((t): t is Travel => t !== null) ?? null
  if (!normal.length && !travel) return null
  return (
    <div className="mx-auto mb-3 grid w-full max-w-xl shrink-0 gap-2">
      {normal.map((c, i) => (
        <button
          key={i}
          onClick={() => onPick(c)}
          disabled={busy}
          style={{ animationDelay: `${i * 70}ms` }}
          className="group relative flex w-full animate-fade-in items-center gap-3 overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(90deg,rgb(40_18_60/0.88),rgb(40_18_60/0.62))] py-2.5 pr-4 pl-4 text-left text-[14px] leading-snug text-white shadow-[0_8px_24px_rgb(0_0_0/0.35)] transition-[border-color,transform] active:scale-[0.99] enabled:hover:border-[#ffd23f]/70 disabled:opacity-45 lg:text-[15px]"
        >
          <span className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-[#ff5fa2] to-[#ffd23f]" />
          <span className="min-w-0 flex-1 [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">{c}</span>
          <span className="shrink-0 text-xs text-white/35 transition-transform group-enabled:group-hover:translate-x-0.5 group-enabled:group-hover:text-[#ffd23f]">›</span>
        </button>
      ))}
      {travel && <TravelChoice travel={travel} call={call} disabled={busy} delay={normal.length * 70} onPick={() => onPick(travel.text)} />}
    </div>
  )
}

/** 换场：一扇小门，门里是目的地；右边写「换场 · 去哪」和那句话，箭头往里走 */
function TravelChoice({ travel, call, disabled, delay, onPick }: { travel: Travel; call: string; disabled: boolean; delay: number; onPick: () => void }) {
  const pack = usePack()
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      style={{ animationDelay: `${delay}ms` }}
      className="group relative flex w-full animate-fade-in items-stretch gap-3 overflow-hidden rounded-2xl border border-[#ffd23f]/45 bg-[linear-gradient(90deg,rgb(40_18_60/0.92),rgb(40_18_60/0.66))] p-1.5 pr-4 text-left shadow-[0_8px_24px_rgb(0_0_0/0.35)] transition-[border-color,transform] active:scale-[0.99] enabled:hover:border-[#ffd23f] disabled:opacity-45"
    >
      <span className="relative h-[52px] w-[80px] shrink-0 overflow-hidden rounded-xl bg-[#1b0f2a] shadow-[inset_0_0_0_1.5px_rgb(255_210_63/0.55)] lg:h-[58px] lg:w-[92px]">
        <img src={bgOf(pack, travel.place)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-enabled:group-hover:scale-110" />
        <span className="absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_60%,transparent,rgb(20_8_30/0.5))]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-[#ffd23f] px-1.5 text-[10px] leading-4 font-black text-[#3a2400]">换场</span>
          <span className="truncate text-[13px] font-bold text-[#ffe58a]">{placeName(travel.place, call)}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-[13.5px] leading-snug text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.5)] lg:text-[14.5px]">{travel.text}</span>
      </span>
      <span className="self-center text-sm text-[#ffd23f]/60 transition-transform group-enabled:group-hover:translate-x-1 group-enabled:group-hover:text-[#ffd23f]">→</span>
    </button>
  )
}
