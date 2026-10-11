import { memo } from 'react'
import { useStage } from '@dianziji/stage/react'
import { CHAR_NAME } from './content'
import { useBeats } from './useGame'

/**
 * 「她在想」气泡（照《妈妈柳月儿》舞台）：刚发出去、她这一轮还没开口时，浮在立绘头旁边，三个点轮流跳；她说出第一句就收起。
 * 位置和心声气泡同一处（心声只在读到最后一句时出，两个不会同时在）；尾巴是两颗小圆（想法气泡），不是说话的尖角。
 * ★自己订阅「在不在生成」和这一轮的句子：App 不跟着重画。只动 transform / opacity；减少动态效果时点不跳（motion-safe）。
 */
export default memo(function ThinkingBubble() {
  const busy = useStage((st) => st.busy)
  const beats = useBeats()
  if (!busy || beats.some((b) => b.kind === 'her')) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-10 px-safe">
      <div className="relative mx-auto h-full max-w-6xl">
        <div
          role="status"
          aria-label={`${CHAR_NAME}在想…`}
          className="absolute top-[max(18%,calc(var(--safe-top)+80px))] left-6 animate-fade-in sm:right-[calc(50%+9vh)] sm:left-auto lg:top-[max(14%,calc(var(--safe-top)+190px))] lg:right-auto lg:left-[calc(50%+13vh)]"
        >
          <div className="flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-4 py-2.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)]">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2 rounded-full bg-[#ff5fa2] motion-safe:animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          {/* 两颗由大到小的小圆，落向她的头：手机在右下（头在右边），电脑在左下 */}
          <span className="absolute -bottom-3 right-5 size-3 rounded-full bg-white/90 lg:right-auto lg:left-5" />
          <span className="absolute -bottom-5.5 right-2 size-1.5 rounded-full bg-white/90 lg:right-auto lg:left-2" />
        </div>
      </div>
    </div>
  )
})
