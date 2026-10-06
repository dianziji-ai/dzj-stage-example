import { useEffect, useSyncExternalStore } from 'react'
import { hideTip, tipStore } from './tipStore'

/**
 * 游戏风提示弹窗（复用）：哪里都能 showTip({...})，App 里挂一个 <TipHost />。
 *   showTip({ icon: '🔒', title: '电玩城还没解锁', text: '好感到 30 才能去～', action: { label: '去地图', onClick } })
 * 样子：奶油色卡片 + 顶上一颗渐变圆章（图标）+ 标题 + 一两句话 + 胶囊按钮（主按钮粉色渐变，另一颗「知道啦」）。
 * 点遮罩 / Esc / 「知道啦」关；同一时间只有一个（新的顶掉旧的）。
 * ★性能：没提示时什么都不渲染；进场只动 transform / opacity；遮罩不用 blur。
 */

export default function TipHost() {
  const tip = useSyncExternalStore(tipStore.subscribe, tipStore.get)

  useEffect(() => {
    if (!tip) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hideTip()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tip])

  if (!tip) return null
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center px-6" role="alertdialog" aria-modal="true" aria-label={tip.title}>
      <button aria-label="关闭" tabIndex={-1} onClick={hideTip} className="absolute inset-0 animate-fade-in cursor-default bg-black/40" />
      {/* key＝标题：新提示顶掉旧的时重播进场动画 */}
      <div
        key={tip.title}
        className={`relative w-full ${tip.rows ? 'max-w-[360px]' : 'max-w-[320px]'} flex max-h-[calc(100dvh-112px)] flex-col animate-tip-in rounded-[28px] border-2 border-white bg-[#fff8f1] px-6 pb-5 ${tip.image ? 'pt-14' : 'pt-10'} text-center text-[#4a2f2a] shadow-[0_6px_0_#f9c5d8,0_24px_50px_-12px_rgba(0,0,0,0.45)]`}
      >
        {/* 顶上的圆章：一半压在卡片外 */}
        <span className={`absolute left-1/2 grid -translate-x-1/2 place-items-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-amber-200 via-pink-300 to-rose-400 text-3xl shadow-[0_4px_0_#e879a6] ${tip.image ? '-top-11 size-[88px]' : '-top-8 size-16'}`}>
          {/* 立绘是全身：放大、贴顶，只露头和肩 */}
          {tip.image ? <img src={tip.image} alt="" decoding="async" className="size-full origin-top scale-[1.9] object-cover object-top" /> : (tip.icon ?? '💡')}
        </span>
        <div className="shrink-0 text-[17px] font-black tracking-wide">{tip.title}</div>
        {/* ★只有中间这段滚（内容长、屏幕矮时）：卡片本身不裁，顶上压出去的圆章才不会被切掉 */}
        <div className="-mx-2 mt-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-1">
        {tip.text && <p className="mt-1 text-sm leading-6 whitespace-pre-line text-[#9a7b72]">{tip.text}</p>}
        {tip.rows && (
          <ul className="mt-2 space-y-2 text-left">
            {tip.rows.map((r) => (
              <li key={r.label} className="flex gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-[0_4px_12px_-8px_rgba(236,72,153,0.4)]">
                <span className="text-lg leading-6">{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <b className="text-sm">{r.label}</b>
                    {r.value && <span className="ml-auto text-sm font-black text-pink-500 tabular-nums">{r.value}</span>}
                  </div>
                  <p className="text-xs leading-5 text-[#9a7b72]">{r.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        </div>
        {tip.note && <p className="mt-3 shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">{tip.note}</p>}
        <div className="mt-4 flex shrink-0 gap-2.5">
          <button onClick={hideTip} className="flex-1 rounded-full border-2 border-pink-200 bg-white py-2.5 text-sm font-bold text-[#9a7b72] shadow-[0_3px_0_#fbcfe0] active:translate-y-0.5 active:shadow-none">
            {tip.dismiss ?? '知道啦'}
          </button>
          {tip.action && (
            <button
              onClick={() => {
                hideTip()
                tip.action!.onClick()
              }}
              className="flex-1 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_#be185d] active:translate-y-0.5 active:shadow-none"
            >
              {tip.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
