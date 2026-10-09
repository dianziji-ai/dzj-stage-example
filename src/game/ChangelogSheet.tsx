import { useEffect } from 'react'
import { CHANGELOG } from './changelog'

/** 更新日志：和手机菜单同款的奶油色纸面（手机从底部弹起，电脑居中），一版一块，新的在最上面。点遮罩 / Esc 收起 */
export default function ChangelogSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center lg:items-center lg:p-6" role="dialog" aria-modal="true" aria-label="更新日志">
      <button aria-label="关闭" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-in cursor-default bg-black/45" />
      <div className="gal-paper relative flex max-h-[80dvh] w-full max-w-md animate-[sheet-up_0.24s_cubic-bezier(0.2,0.9,0.3,1)] flex-col rounded-t-[28px] px-safe pb-[max(var(--safe-bottom),16px)] text-[#4a2f2a] shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.4)] lg:rounded-[28px] lg:pb-4">
        <div className="flex h-14 shrink-0 items-center px-5">
          <b className="text-[16px]">更新日志</b>
          <span className="flex-1" />
          <button onClick={onClose} aria-label="关闭" className="grid size-9 place-items-center rounded-full text-[#9a7b72] hover:bg-black/5">
            ✕
          </button>
        </div>
        <ol className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-2">
          {CHANGELOG.map((e, i) => (
            <li key={e.id} className="relative border-l-2 border-pink-200 pb-4 pl-4 last:pb-1">
              <span className={`absolute top-1 -left-[7px] size-3 rounded-full ring-2 ring-white ${i === 0 ? 'bg-pink-500' : 'bg-pink-200'}`} aria-hidden />
              <p className="text-[11px] text-[#9a7b72]">
                {e.date}
                {i === 0 && <span className="ml-2 rounded-full bg-pink-100 px-1.5 py-px text-[10px] font-bold text-pink-500">最新</span>}
              </p>
              <h3 className="mt-0.5 text-[15px] font-bold">{e.title}</h3>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#6b5048]">{e.items.join(' · ')}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
