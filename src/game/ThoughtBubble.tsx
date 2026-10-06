import { memo, useState } from 'react'
import { useThought } from './useGame'

/**
 * 心声气泡：她没说出口的那句真心话，飘在立绘头旁边（云朵 + 两颗小圆点连向头）。
 *  · 这一轮写完才出现（useThought：生成中是空的），晚 0.8 秒浮出来，不抢正文；下一轮开始自然消失。
 *  · 手机：小一号，贴在头的左上方（顶栏细胶囊下面；右边是抓娃娃竖栏）；平板：以屏幕中线（她的头）为准放在头的左上方；电脑：头的右边。
 *  · 点一下收起（同一句不再出现）。
 * ★性能：半透明白底不用 blur；进场只动 transform / opacity；memo：只收一个字符串。
 */
export default memo(function ThoughtBubble() {
  const text = useThought() // 自己按区订阅心声：AI 写正文时不重画
  const [closed, setClosed] = useState('') // 收起过的那句
  if (!text || closed === text) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-10 px-safe">
      <div className="relative mx-auto h-full max-w-6xl">
        <button
          key={text}
          onClick={() => setClosed(text)}
          aria-label={`心声：${text}（点一下收起）`}
          className="pointer-events-auto absolute top-[max(15%,calc(var(--safe-top)+64px))] left-3 max-w-[min(50vw,190px)] sm:right-[calc(50%+7vh)] sm:left-auto sm:max-w-[220px] animate-[thought-in_0.5s_cubic-bezier(0.2,1.2,0.4,1)_0.8s_both] text-left lg:top-[12%] lg:right-auto lg:left-[calc(50%+12vh)] lg:max-w-[280px]"
        >
          <span className="relative block rounded-[22px] border border-white/80 bg-white/90 px-3 py-2 text-xs leading-snug text-[#8a4a6a] italic shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)] lg:px-4 lg:text-sm">
            <span className="mr-1 not-italic">💭</span>
            {text}
          </span>
          {/* 两颗小圆点连向头：手机在右下（头在右边），电脑在左下（头在左边） */}
          <span className="absolute -bottom-3 right-6 size-3 rounded-full bg-white/90 shadow-sm lg:right-auto lg:left-6" />
          <span className="absolute -bottom-6 right-3 size-1.5 rounded-full bg-white/90 lg:right-auto lg:left-3" />
        </button>
      </div>
    </div>
  )
})
