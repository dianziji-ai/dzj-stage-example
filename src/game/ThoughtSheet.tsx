import { createPortal } from 'react-dom'
import { CHAR_NAME } from './content'

/**
 * 心声弹窗：点心声云打开，完整显示这一句（云里平时最多 3 行）。不管长短都能点开——云在画面上一闪就过，想细看就点。
 * 同其它弹层（ChoiceConfirm 同款奶油色纸面）：portal 到 body、data-no-advance（点它不翻页）；手机底部抽屉、电脑居中；点外面 / ✕ 收起。
 */
export default function ThoughtSheet({ text, onClose }: { text: string; onClose: () => void }) {
  return createPortal(
    <div data-no-advance className="fixed inset-0 z-[72] flex items-end justify-center px-safe lg:items-center" role="dialog" aria-modal="true" aria-label={`${CHAR_NAME}的心声`} onContextMenu={(e) => e.stopPropagation()}>
      <button aria-label="关闭" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-in cursor-default bg-black/45" />
      <div className="gal-paper relative m-3 mb-[max(var(--safe-bottom),12px)] flex max-h-[70dvh] w-full max-w-sm animate-[sheet-up_0.24s_cubic-bezier(0.2,0.9,0.3,1)] flex-col rounded-[24px] p-5 text-[#4a2f2a] shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.4)]">
        <div className="flex shrink-0 items-center">
          <b className="text-[15px] text-[#8a4a6a]">💭 {CHAR_NAME}的心声</b>
          <span className="flex-1" />
          <button onClick={onClose} aria-label="关闭" className="-mr-1 grid size-8 place-items-center rounded-full text-[#9a7b72] hover:bg-white/70">
            ✕
          </button>
        </div>
        <p className="mt-3 min-h-0 overflow-y-auto overscroll-contain rounded-2xl bg-white px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-[#8a4a6a] shadow-[0_6px_16px_-10px_rgba(236,72,153,0.45)]">{text}</p>
      </div>
    </div>,
    document.body,
  )
}
