import SendButton from './SendButton'

/**
 * 手机全屏输入：盖住整个舞台，顶部让刘海（pt-safe），底部让键盘（pb-composer）。
 * 整个页面是 fixed 的，iOS 弹键盘时没东西可推；文字区占满剩下的高度。
 * ★字号 16px（text-base）：iOS 输入框字号小于 16px 一聚焦就会自动放大页面。
 */
export default function InputSheet({ value, onChange, onSend, onClose, disabled }: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onClose: () => void
  disabled: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg pt-safe px-safe lg:hidden">
      <div className="flex h-12 items-center justify-between px-4">
        <button onClick={onClose} className="text-muted">
          取消
        </button>
        <span className="text-sm text-muted">{value.length} 字</span>
      </div>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="说点什么…"
        className="flex-1 resize-none bg-transparent px-4 py-2 text-base leading-7 outline-none placeholder:text-muted"
      />
      <div className="flex justify-end px-4 pt-2 pb-composer">
        <SendButton onClick={onSend} disabled={!value.trim() || disabled} />
      </div>
    </div>
  )
}
