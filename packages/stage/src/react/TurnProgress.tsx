import { useTurnProgress } from './useZone'

/**
 * 现成的进度小组件：「● 正在写 · 表情」+ 一条细进度条。没在生成时不显示。
 *   <TurnProgress />                                            区名用卡里分区的名字
 *   <TurnProgress labels={{ thought: '偷偷想心事中' }} />          换成自己的说法（按区 id）
 * 还没开始写任何区（刚发出去、AI 在想）显示「正在想…」。外观用 sp-* 主题变量，className 可以整个换掉。
 * 进度只看 AI 写到哪个区了（不数写完了几个）；AI 一写完就收起，不管后面还有几个区没写。
 * ★性能：进度条只动 transform；进度只在换区 / 区写完时变，不是每个字都变。
 */
export default function TurnProgress({ labels = {}, className = 'border border-sp-line bg-sp-card/90 text-sp-text shadow-sm' }: {
  /** 区 id → 显示的说法 */
  labels?: Record<string, string>
  className?: string
}) {
  const p = useTurnProgress()
  if (!p) return null
  const text = p.zone ? (labels[p.zone] ?? `正在写 · ${p.label}`) : (labels[''] ?? '正在想…')
  return (
    <div role="status" aria-live="polite" className={`inline-flex min-w-36 flex-col gap-1 rounded-2xl px-3 py-1.5 text-xs ${className}`}>
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 animate-pulse rounded-full bg-sp-accent" />
        <span className="truncate">{text}</span>
      </span>
      <span className="h-1 overflow-hidden rounded-full bg-sp-line">
        <span className="block h-full origin-left rounded-full bg-sp-accent transition-transform duration-500" style={{ transform: `scaleX(${Math.max(0.04, p.ratio)})` }} />
      </span>
    </div>
  )
}
