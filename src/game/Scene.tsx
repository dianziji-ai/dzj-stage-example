import { memo, useEffect, useState } from 'react'
import { bgUrl, EXPRESSIONS, spriteUrl, type ExprId, type PlaceId } from './content'

/**
 * 舞台画面：背景 + 立绘。
 *  · 换地点 / 换表情：新图**加载完**才淡入，淡完再撤旧图（没加载完就撤会闪黑）。
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
      <Fade src={bgUrl(place)} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 flex h-[92%] justify-center">
        {/* ★动画分三层各管一件事：晃（说话）/ 呼吸 / 淡入。同一个元素上叠两个 animation 只有一个生效，淡入就永远结束不了 */}
        <div className={`h-full ${talking ? 'animate-[pop_0.9s_ease-in-out_infinite]' : ''}`}>
          <div className="relative h-full animate-breathe">
            <Fade src={spriteUrl(expr)} className="h-full w-auto max-w-none object-contain object-bottom" />
          </div>
        </div>
      </div>
    </div>
  )
})

/** 交叉淡入：旧图垫底，新图加载完淡入，淡完把旧图撤掉 */
function Fade({ src, className }: { src: string; className: string }) {
  const [shown, setShown] = useState(src) // 已经稳定显示的那张
  const [next, setNext] = useState<string | null>(null) // 正在进来的那张（加载完才开始淡入）
  const [ready, setReady] = useState(false)

  if (src !== shown && src !== next) {
    setNext(src)
    setReady(false)
  }
  const done = () => {
    if (next) setShown(next)
    setNext(null)
    setReady(false)
  }

  return (
    <>
      <img src={shown} alt="" decoding="async" className={className} />
      {next && (
        <img
          key={next}
          src={next}
          alt=""
          decoding="async"
          onLoad={() => setReady(true)}
          onError={done}
          onAnimationEnd={(e) => e.animationName === 'fade-in' && done()}
          className={`${className} absolute inset-0 ${ready ? 'animate-fade-in' : 'opacity-0'}`}
        />
      )}
    </>
  )
}
