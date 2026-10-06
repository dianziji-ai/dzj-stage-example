import { Icon } from '../components/icons'
import { usePref } from './usePref'

/**
 * 选项区，可收起：
 *  展开：一行淡淡的「选项 · 4」+ 收起钮，下面是选项按钮（手机竖排；矮屏两列）。
 *  收起：靠右一颗小胶囊「▴ 4 个选项」（左边留给对话框的名牌），点了展开；新一轮选项来了胶囊轻闪一下（key 换了重播 fade-in）。
 * 收起状态记在本机。
 */
export default function Choices({ choices, busy, forceClosed = false, onExpand, onPick }: {
  choices: string[]
  busy: boolean
  /** 对话框展开（阅读模式）时强制收成胶囊，两者不同时占地方 */
  forceClosed?: boolean
  /** 点胶囊时顺便让对话框回标准高度 */
  onExpand?: () => void
  onPick: (c: string) => void
}) {
  const [mode, setMode] = usePref('gal-choices', 'open', ['open', 'closed'] as const)
  if (!choices.length) return null

  if (mode === 'closed' || forceClosed) {
    return (
      // 靠右：左边是名牌，别挤在一起
      <div className="mb-3 flex shrink-0 justify-end">
        <button
          key={choices.join('|')}
          onClick={() => {
            setMode('open')
            onExpand?.()
          }}
          className="glass-strong flex animate-fade-in items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
        >
          <Icon name="up" className="size-4" />
          {choices.length} 个选项
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto mb-3 flex min-h-0 w-full max-w-md shrink-0 flex-col lg:max-w-xl [@media(max-height:520px)]:max-w-none">
      <div className="mb-1.5 flex items-center px-1 text-[11px] text-white/60">
        <span className="flex-1 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">选项 · {choices.length}</span>
        <button onClick={() => setMode('closed')} aria-label="收起选项" className="glass flex items-center gap-1 rounded-full px-2.5 py-1">
          <Icon name="down" className="size-3.5" />
          收起
        </button>
      </div>
      {/* 选项多 / 屏矮时选项区自己滚，不把对话框挤没 */}
      <div className="grid max-h-[30dvh] gap-1.5 overflow-y-auto overscroll-contain lg:gap-2 [@media(max-height:520px)]:max-h-[26dvh] [@media(max-height:520px)]:grid-cols-2">
        {choices.map((c, i) => (
          <button
            key={i}
            onClick={() => onPick(c)}
            disabled={busy}
            className="glass-strong w-full animate-fade-in rounded-2xl px-4 py-2 text-sm leading-snug transition-colors hover:border-pink-300 active:bg-pink-500/40 lg:py-2.5 lg:text-[15px] [@media(max-height:520px)]:py-1.5"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
