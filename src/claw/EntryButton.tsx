import { plushUrl } from './data'

/**
 * 抓娃娃机入口。在电玩城：亮着，点了进机器；不在 / 她在说话：灰掉，点了 onLocked 弹提示（告诉玩家去电玩城）。
 *  rail（手机）：右侧竖栏里一颗 44px 小圆钮——金色小鸡 + 硬币角标，不挡立绘。
 *  sign（电脑）：横向「街机招牌」卡片（亮橙渐变 + 厚底边，按下会沉）。
 * 位置由 App 摆（手机竖栏 / 电脑顶栏下右侧），这里只管长相。
 * 动画只动 transform / opacity；系统「减少动态效果」时全局停掉（index.css）。
 */
export default function EntryButton({ variant, coins, hint, onOpen, onLocked }: {
  variant: 'rail' | 'sign'
  coins: number
  /** 不能玩时的原因（「先去地图 · 电玩城」）；null＝能玩 */
  hint: string | null
  onOpen: () => void
  /** 灰着的时候点了做什么（弹提示）*/
  onLocked: () => void
}) {
  const off = hint !== null
  const click = off ? onLocked : onOpen
  const label = off ? `抓娃娃机：${hint}` : `抓娃娃机，剩 ${coins} 枚硬币`

  if (variant === 'rail') {
    return (
      <button
        onClick={click}
        aria-label={label}
        className={`relative grid size-11 place-items-center rounded-full border-2 border-amber-100 bg-gradient-to-b from-amber-300 via-orange-400 to-rose-500 shadow-[0_3px_0_#9a3412,0_8px_16px_-6px_rgba(0,0,0,0.5)] transition-transform active:translate-y-0.5 active:shadow-[0_1px_0_#9a3412] ${off ? 'opacity-75 grayscale' : ''}`}
      >
        <img src={plushUrl('goldchick')} alt="" className={`size-8 object-contain ${off ? '' : 'animate-[wiggle_1.8s_ease-in-out_infinite]'}`} />
        <span className={`absolute -top-1 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white px-1 text-[10px] leading-none font-black text-white ${coins > 0 ? 'bg-rose-500' : 'bg-slate-400'}`}>{coins}</span>
      </button>
    )
  }

  return (
    <button
      onClick={click}
      aria-label={label}
      className={`relative flex animate-fade-in items-center gap-3 rounded-[24px] border-2 border-amber-100 bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 py-2 pr-4 pl-2 text-left shadow-[0_6px_0_#9a3412,0_14px_28px_-8px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#9a3412] ${off ? 'opacity-85 grayscale' : ''}`}
    >
      <span className={`absolute -top-1.5 -right-1.5 z-10 grid h-6 min-w-6 place-items-center rounded-full border-2 border-white px-1.5 text-[11px] font-black text-white shadow ${coins > 0 ? 'bg-rose-500' : 'bg-slate-400'}`}>🪙{coins}</span>
      <span className="grid size-14 place-items-center rounded-2xl bg-white/90">
        <img src={plushUrl('goldchick')} alt="" className={`size-12 object-contain ${off ? '' : 'animate-[wiggle_1.8s_ease-in-out_infinite]'}`} />
      </span>
      <span>
        <span className="block text-base font-black tracking-wide text-white [text-shadow:0_2px_0_#9a3412]">小鸡抓抓乐</span>
        <span className="block text-xs font-semibold text-amber-50">{coins > 0 ? `🪙 ${coins} · ${off ? '在电玩城' : '去玩一局'}` : '硬币用完啦'}</span>
      </span>
      <span className="ml-1 text-lg text-white [text-shadow:0_1px_0_#9a3412]">▶</span>
    </button>
  )
}
