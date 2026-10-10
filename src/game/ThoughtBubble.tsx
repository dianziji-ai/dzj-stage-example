import { memo, useState } from 'react'
import ThoughtSheet from './ThoughtSheet'
import { useThought } from './useGame'

/**
 * 心声气泡：她没说出口的那句真心话，飘在立绘头旁边（云朵 + 两颗小圆点连向头）。
 *  · 读到这一轮最后一句才出现（App 按对话框的 onEnd 挂它）：和行动选项一起丝滑地浮出来（气泡 0.12s 起、选项 0.3s 起，见 styles/animations.css），浮好后轻轻漂；下一轮开始自然消失。
 *  · 手机：小一号，贴在头的左上方（顶栏细胶囊下面；右边是抓娃娃竖栏）；平板：以屏幕中线（她的头）为准放在头的左上方；
 *    电脑：头的右边，★顶部至少在右上角「小鸡抓抓乐」招牌下沿之下（招牌在顶栏下 80px、高约 90px，层级比气泡高，窗口窄一点就会盖住气泡）。
 *  · 心声有时写得长：云里最多 3 行（尾巴「…」）；点一下一律弹窗看完整一句（ThoughtSheet，不管长短都能点）。
 * ★性能：半透明白底不用 blur；进场只动 transform / opacity；memo：只收一个字符串。
 */
export default memo(function ThoughtBubble() {
  const text = useThought() // 自己按区订阅心声：AI 写正文时不重画
  const [open, setOpen] = useState(false)
  if (!text) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-10 px-safe">
      <div className="relative mx-auto h-full max-w-6xl">
        <button
          key={text}
          data-no-advance
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={`心声：${text}（点开看完整）`}
          className="pointer-events-auto absolute top-[max(15%,calc(var(--safe-top)+64px))] left-3 max-w-[min(50vw,190px)] sm:right-[calc(50%+7vh)] sm:left-auto sm:max-w-[220px] origin-bottom animate-thought-in text-left lg:top-[max(12%,calc(var(--safe-top)+184px))] lg:right-auto lg:left-[calc(50%+12vh)] lg:max-w-[280px]"
        >
          {/* 浮好后轻轻漂（和浮出来分两层：同一个元素叠两个 animation 只有一个生效） */}
          <span className="block animate-drift">
          <span className="relative line-clamp-3 rounded-[22px] border border-white/80 bg-white/90 px-3 py-2 text-xs leading-snug text-[#8a4a6a] italic shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)] lg:px-4 lg:text-sm">
            <span className="mr-1 not-italic">💭</span>
            {text}
          </span>
          {/* 两颗小圆点连向头：手机在右下（头在右边），电脑在左下（头在左边） */}
          <span className="absolute -bottom-3 right-6 size-3 rounded-full bg-white/90 shadow-sm lg:right-auto lg:left-6" />
          <span className="absolute -bottom-6 right-3 size-1.5 rounded-full bg-white/90 lg:right-auto lg:left-3" />
          </span>
        </button>
      </div>
      {open && <ThoughtSheet text={text} onClose={() => setOpen(false)} />}
    </div>
  )
})
