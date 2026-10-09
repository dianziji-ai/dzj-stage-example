import { useState } from 'react'
import { createPortal } from 'react-dom'
import { CHAR_NAME } from './content'

/**
 * 点行动选项时的确认（和手机菜单同款奶油色纸面）：点了就直接发给她（不填输入框），扣这一轮的能量。
 * 「以后不再提示」默认勾着：勾着发出去就记住、以后直接发；取消勾选＝只发这一次，下次还问。
 * data-no-advance：弹窗里的点击不算点空白翻页。
 */
export default function ChoiceConfirm({ text, onSend, onCancel }: { text: string; onSend: (remember: boolean) => void; onCancel: () => void }) {
  const [remember, setRemember] = useState(true)
  return createPortal(
    <div data-no-advance className="fixed inset-0 z-[72] flex items-end justify-center px-safe lg:items-center" role="alertdialog" aria-modal="true" aria-label="点选项会直接发送" onContextMenu={(e) => e.stopPropagation()}>
      <button aria-label="取消" tabIndex={-1} onClick={onCancel} className="absolute inset-0 animate-fade-in cursor-default bg-black/45" />
      <div className="gal-paper relative m-3 mb-[max(var(--safe-bottom),12px)] w-full max-w-sm animate-[sheet-up_0.24s_cubic-bezier(0.2,0.9,0.3,1)] rounded-[24px] p-5 text-[#4a2f2a] shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.4)]">
        <b className="block text-[16px]">点选项会直接发出去</b>
        <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-[13.5px] leading-relaxed shadow-[0_6px_16px_-10px_rgba(236,72,153,0.45)]">{text}</p>
        <p className="mt-3 text-[12.5px] leading-relaxed text-[#9a7b72]">点了就作为你这一轮的话发给{CHAR_NAME}，扣这一轮的能量。</p>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[13px] select-none">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 shrink-0 accent-pink-500" />
          以后不再提示，点选项直接发送
        </label>
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-full bg-white py-2.5 text-[14px] text-[#9a7b72] shadow-[0_6px_16px_-10px_rgba(236,72,153,0.45)] active:scale-95">
            再想想
          </button>
          <button onClick={() => onSend(remember)} className="flex-[2] rounded-full bg-gradient-to-r from-pink-400 to-rose-500 py-2.5 text-[14px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(236,72,153,0.7)] active:scale-95">
            发送
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
