import { type ReactNode, type RefObject } from 'react'
import { Icon } from '../../components/icons'

/** 游玩以外的页面：大标题 + 一句副标题 + 可滚内容（底部菜单由 App 接在下面）。底色是 gal-paper（静态渐变）。 */
export default function Page({ title, sub, action, scrollRef, onBack, children }: {
  title: string
  sub: string
  action?: ReactNode
  scrollRef?: RefObject<HTMLDivElement | null>
  /** 左上角返回（回游玩页） */
  onBack: () => void
  children: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col pt-safe px-safe">
      <header className="mx-auto w-full max-w-3xl shrink-0 px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          {/* 返回：手机电脑一样大（40px 好点），白底小圆钮 */}
          <button onClick={onBack} aria-label="返回" className="-ml-1 grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#9a7b72] shadow-[0_4px_12px_-6px_rgba(236,72,153,0.45)] active:scale-95">
            <Icon name="back" className="size-5" />
          </button>
          <h1 className="flex-1 text-xl font-bold tracking-wide">{title}</h1>
          {action}
        </div>
        <p className="mt-0.5 pl-[46px] text-xs text-[#9a7b72]">{sub}</p>
      </header>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  )
}
