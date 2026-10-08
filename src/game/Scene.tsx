import { CrossfadeImage } from '@dianziji/stage/react'
import { memo, useEffect } from 'react'
import { bgUrl, EXPRESSIONS, spriteUrl, type ExprId, type PlaceId } from './content'

/**
 * 舞台画面：背景 + 立绘。
 *  · 换地点 / 换表情：SDK 的 CrossfadeImage——新图下载 + 解码完才上屏，背景盖上去淡入（mode="over"，不变暗），
 *    立绘交叉淡化（新淡入、旧同时淡出，透明底不重影）。
 *  · 立绘一直轻轻呼吸；正在说话（流式输出中）时轻轻上下晃。
 *  · memo：打字时每来一个字父组件都会重渲染，这里的参数没变就跳过。
 */
export default memo(function Scene({ place, expr, talking }: { place: PlaceId; expr: ExprId; talking: boolean }) {
  // 空闲时把 8 张表情先拉下来（每张约 100KB），之后换表情不用等下载
  useEffect(() => {
    const load = () => EXPRESSIONS.forEach((e) => (new Image().src = spriteUrl(e)))
    if ('requestIdleCallback' in window) window.requestIdleCallback(load)
    else setTimeout(load, 1500)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <CrossfadeImage src={bgUrl(place)} mode="over" duration={450} className="absolute inset-0" imgClassName="size-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 flex h-[92%] justify-center">
        {/* ★动画分三层各管一件事：晃（说话）/ 呼吸 / 淡入。同一个元素上叠两个 animation 只有一个生效，淡入就永远结束不了 */}
        <div className={`h-full ${talking ? 'animate-[pop_0.9s_ease-in-out_infinite]' : ''}`}>
          <div className="relative h-full animate-breathe">
            <CrossfadeImage src={spriteUrl(expr)} className="h-full" imgClassName="h-full w-auto max-w-none object-contain object-bottom" />
          </div>
        </div>
      </div>
    </div>
  )
})
