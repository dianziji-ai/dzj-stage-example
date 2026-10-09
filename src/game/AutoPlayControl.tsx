import { useEffect, useRef, useState } from 'react'
import { AutoPlayButton, AutoPlaySettings, type AutoPlayState } from '@dianziji/stage-autoplay'

/**
 * 对话框标题栏里的自动播放：一颗胶囊——左边「自动」开关（开着时底色从左往右填满＝倒计时），右边「调节」一格点开浮出设置（每字停留 / 句末停顿）。
 * 计时本身在对话框里（useAutoPlay），这里只管显示。设置面板点外面 / Esc 收起。
 * ★自动播放是独立模块 @dianziji/stage-autoplay（只依赖 react）：别的舞台照这样接就有。
 */
export default function AutoPlayControl({ state }: { state: AutoPlayState }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div ref={box} className="relative flex items-center">
      <AutoPlayButton state={state} className="dzj-ap-gal" onSettings={() => setOpen((v) => !v)} settingsOpen={open} />
      {open && (
        <div className="absolute right-0 bottom-full z-30 mb-2 w-64 animate-rise-in rounded-2xl bg-[linear-gradient(160deg,rgb(52_22_74/0.97),rgb(28_12_42/0.97))] p-4 shadow-[0_14px_36px_rgb(0_0_0/0.45),inset_0_0_0_1px_rgb(255_255_255/0.08)]">
          <AutoPlaySettings className="dzj-ap-gal" />
        </div>
      )}
    </div>
  )
}
