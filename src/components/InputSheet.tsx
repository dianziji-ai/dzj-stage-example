import { Icon } from './icons'

/**
 * 手机全屏输入：盖住整个舞台，顶部让刘海（pt-safe）。
 *   [取消        12 字        发送]   ← ★发送在右上角：键盘弹起会盖住屏幕下半截（页面是 fixed 的、不推），放底下就点不到
 * 文字区占满剩下的高度。
 * ★字号 16px（text-base）：iOS 输入框字号小于 16px 一聚焦就会自动放大页面。
 */
export default function InputSheet({ value, onChange, onSend, onClose, disabled }: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onClose: () => void
  disabled: boolean
}) {
  const canSend = !!value.trim() && !disabled
  return (
    <div data-no-advance className="fixed inset-0 z-50 flex flex-col bg-bg pt-safe px-safe lg:hidden">
      <div className="relative flex h-14 shrink-0 items-center justify-between px-4">
        <button onClick={onClose} className="py-2 text-muted">
          取消
        </button>
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-sm text-muted tabular-nums">{value.length} 字</span>
        <button
          onClick={onSend}
          disabled={!canSend}
          className="flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-white transition-opacity disabled:bg-line disabled:text-muted"
        >
          发送
          <Icon name="send" className="size-4" />
        </button>
      </div>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="说点什么…"
        className="min-h-0 flex-1 resize-none bg-transparent px-4 pt-1 pb-[calc(var(--safe-bottom)+12px)] text-base leading-7 outline-none placeholder:text-muted"
      />
    </div>
  )
}
