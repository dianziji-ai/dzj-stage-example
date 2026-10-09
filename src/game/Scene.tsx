import { CrossfadeImage } from '@dianziji/stage/react'
import { memo, useEffect } from 'react'


/**
 * 舞台画面：背景 + 立绘（地址由 App 从配图库挑好交进来，见 art.ts）。
 *  · 换地点 / 换表情：SDK 的 CrossfadeImage——新图下载 + 解码完才上屏，背景盖上去淡入（mode="over"，不变暗），
 *    立绘交叉淡化（新淡入、旧同时淡出，透明底不重影）。
 *  · 立绘一直轻轻呼吸；正在说话（流式输出中）时轻轻上下晃。
 *  · memo：打字时每来一个字父组件都会重渲染，这里的参数没变就跳过。
 */
export default memo(function Scene({ bg, sprite, preload, talking }: { bg: string; sprite: string; preload: string[]; talking: boolean }) {
  // 空闲时把全部立绘先拉下来（每张约 100KB），之后换表情、换衣服不用等下载
  useEffect(() => {
    const load = () => preload.forEach((src) => (new Image().src = src))
    if ('requestIdleCallback' in window) window.requestIdleCallback(load)
    else setTimeout(load, 1500)
  }, [preload])

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <CrossfadeImage src={bg} mode="over" duration={450} className="absolute inset-0" imgClassName="size-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 flex h-[92%] justify-center">
        {/* ★动画分三层各管一件事：晃（说话）/ 呼吸 / 淡入。同一个元素上叠两个 animation 只有一个生效，淡入就永远结束不了 */}
        <div className={`h-full ${talking ? 'animate-[pop_0.9s_ease-in-out_infinite]' : ''}`}>
          <div className="relative h-full animate-breathe">
            <CrossfadeImage src={sprite} className="h-full" imgClassName="h-full w-auto max-w-none object-contain object-bottom" />
          </div>
        </div>
      </div>
    </div>
  )
})
