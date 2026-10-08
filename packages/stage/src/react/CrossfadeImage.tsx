import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

type Layer = { key: number; src: string }

export type CrossfadeImageProps = {
  /** 要显示的图；换了就换（空字符串＝不换，保留现在这张） */
  src: string
  alt?: string
  /** 外层（定位、尺寸）：比如背景 `absolute inset-0`、立绘 `h-full` */
  className?: string
  style?: CSSProperties
  /** 每张图自己的样式（尺寸、object-fit…），照写一张普通 <img> 那样写：比如 `size-full object-cover`、`h-full w-auto object-contain object-bottom` */
  imgClassName?: string
  /**
   * 怎么换：
   *   cross（默认）＝新图淡入、旧图同时淡出——立绘这类透明底的图用它，不然淡入时透过新图看得见旧图（重影）；
   *   over＝新图盖在旧图上淡入、旧图不动——背景这类不透明的图用它，过程中画面不会变暗。
   */
  mode?: 'cross' | 'over'
  /** 淡入淡出多久（毫秒，默认 300；系统开了「减少动态效果」就直接换） */
  duration?: number
  /** 图加载失败（还显示原来那张） */
  onError?: (src: string) => void
}

/**
 * 换图不闪、换得顺：新图**下载 + 解码完**才上屏，然后淡入（立绘交叉淡化、背景覆盖淡入）；没好之前一直显示原来那张。
 *   · 第一张也一样：解码完才淡入，不会先闪一下空框或半张图。
 *   · 连着换好几次：只显示最后要的那张，中间没赶上的直接跳过。
 *   · 加载失败：保留原来那张，调 onError。
 *   · 只动 opacity（Web Animations），手机上不卡；淡完旧图从页面上撤掉，同一时间最多两张。
 * 排版：所有图叠在外层的同一个网格格子里（display: grid），每张图的尺寸照 imgClassName 自己算，和单独一张 <img> 一样。
 *
 *   <CrossfadeImage src={bg} mode="over" className="absolute inset-0" imgClassName="size-full object-cover" />
 *   <CrossfadeImage src={sprite} className="h-full" imgClassName="h-full w-auto max-w-none object-contain object-bottom" />
 */
export default function CrossfadeImage({ src, alt = '', className, style, imgClassName, mode = 'cross', duration = 300, onError }: CrossfadeImageProps) {
  const [layers, setLayers] = useState<Layer[]>([])
  const seq = useRef(0)
  const want = useRef(src) // 最后要的那张：晚到的旧请求认它，不是它就丢掉
  const errRef = useRef(onError)
  useEffect(() => {
    errRef.current = onError
  })

  useEffect(() => {
    want.current = src
    if (!src) return
    let alive = true
    void decodeImage(src).then((ok) => {
      if (!alive || want.current !== src) return
      if (!ok) return errRef.current?.(src)
      // 已经是最上面那张（比如换走又马上换回来）就不动；否则叠一张新的上去，旧的最多留一张（正在淡出的那张）
      setLayers((ls) => (ls.at(-1)?.src === src ? ls : [...ls.slice(-1), { key: ++seq.current, src }]))
    })
    return () => {
      alive = false
    }
  }, [src])

  // 新叠上来的那张淡入、下面那张（cross）同时淡出；新那张淡完，下面的撤掉
  const els = useRef(new Map<number, HTMLImageElement>())
  const animated = useRef(new Set<number>())
  useLayoutEffect(() => {
    const top = layers.at(-1)
    if (!top || animated.current.has(top.key)) return
    animated.current.add(top.key)
    const ms = reducedMotion() ? 0 : duration
    // 只剩它一张就原样返回（返回新数组会再渲染一轮）
    const dropBelow = () => setLayers((ls) => (ls.length > 1 && ls.at(-1)?.key === top.key ? ls.slice(-1) : ls))
    const el = els.current.get(top.key)
    if (!el || typeof el.animate !== 'function' || ms <= 0) return dropBelow()
    const ease = { duration: ms, easing: 'ease-out', fill: 'both' as const }
    if (mode === 'cross') {
      // 只给终点：从它此刻的透明度淡出（连着换时下面那张可能正淡入到一半，写死从 1 开始会先跳亮再淡＝闪一下）
      for (const l of layers.slice(0, -1)) els.current.get(l.key)?.animate([{ opacity: 0 }], ease)
    }
    const a = el.animate([{ opacity: 0 }, { opacity: 1 }], ease)
    a.onfinish = dropBelow
  }, [layers, mode, duration])

  return (
    <div className={className} style={{ display: 'grid', ...style }}>
      {layers.map((l, i) => {
        const top = i === layers.length - 1
        return (
          <img
            key={l.key}
            // ★只记元素、不清「淡入过」：每次渲染 React 都会先拿 null 再拿元素调一遍这里，清了就会把同一张图再淡入一次
            ref={(el) => {
              if (el) els.current.set(l.key, el)
              else els.current.delete(l.key)
            }}
            src={l.src}
            alt={top ? alt : ''}
            aria-hidden={top ? undefined : true}
            decoding="async"
            draggable={false}
            className={imgClassName}
            style={{ gridArea: '1 / 1' }}
          />
        )
      })}
    </div>
  )
}

/** 下载 + 解码；成功＝true。decode 不支持的环境退回 onload */
function decodeImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    if (typeof img.decode === 'function') {
      img.decode().then(
        () => resolve(true),
        () => resolve(false),
      )
    } else {
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
    }
  })
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}
