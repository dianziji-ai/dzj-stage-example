import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AutoPlayButton, SettingsPanel, type AutoPlayState } from '@dianziji/stage-settings'

/**
 * 对话框标题栏里的播放控制：低调的「▶ 自动」开关（开着时下面一道发丝线长满就翻下一句）+「调节」小图标，
 * 点开整个播放设置面板（文本速度 / 字号 / 动效 / 选项行为 / 自动播放）：手机从底部升起、电脑居中（同快捷指令盘）；点背景 / Esc 收起。
 * 计时、打字在对话框里（useAutoPlay / useTypewriter），这里只管显示。
 * ★面板挂到 body 上（portal）：对话框在画面中间偏右，从按钮旁边展开会超出手机屏幕。
 * ★播放设置是独立模块 @dianziji/stage-settings（只依赖 react）：别的舞台照这样接就有。
 */
export default function PlayControl({ state }: { state: AutoPlayState }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <AutoPlayButton state={state} className="dzj-ap-gal" onSettings={() => setOpen((v) => !v)} settingsOpen={open} />
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 lg:items-center" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-label="播放设置"
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[80dvh] w-full max-w-md animate-rise-in flex-col overflow-hidden rounded-t-[28px] bg-[linear-gradient(160deg,rgb(52_22_74/0.98),rgb(28_12_42/0.98))] pb-safe shadow-[0_-12px_40px_rgb(0_0_0/0.4),inset_0_0_0_1px_rgb(255_255_255/0.08)] lg:max-w-sm lg:rounded-[28px] lg:pb-0"
            >
              <div className="flex h-12 shrink-0 items-center px-5">
                <b className="text-[15px] text-white">播放设置</b>
                <span className="flex-1" />
                <button onClick={() => setOpen(false)} aria-label="关闭" className="grid size-9 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
                  ✕
                </button>
              </div>
              <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">
                <SettingsPanel className="dzj-ap-gal" />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
