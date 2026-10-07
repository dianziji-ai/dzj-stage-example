/**
 * 回看提示条（对话框上方）：「回看 · 往前 3 轮 · 你说：……」+「回到最新」。
 * 只在回看时出现；正文 / 立绘 / 场景由 SDK 换成那一轮的，这条让玩家知道自己在看旧的、一键回来。
 */
export default function ReviewBar({ back, said, me, onLatest }: {
  /** 往前第几轮（1＝上一轮） */
  back: number
  /** 那一轮玩家说的话（开场＝''） */
  said: string
  me: string
  onLatest: () => void
}) {
  return (
    <div role="status" className="glass-strong mb-2 flex animate-fade-in items-center gap-2 rounded-full py-1 pr-1 pl-3 text-xs">
      <span className="shrink-0 rounded-full bg-amber-300/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-950">回看</span>
      <span className="min-w-0 flex-1 truncate text-white/80">
        {back > 0 ? `往前 ${back} 轮` : '开场'}
        {said && (
          <span className="text-white/55">
            {' · '}
            {me || '你'}：{said}
          </span>
        )}
      </span>
      <button onClick={onLatest} className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 font-semibold text-white hover:bg-white/25">
        回到最新
      </button>
    </div>
  )
}
