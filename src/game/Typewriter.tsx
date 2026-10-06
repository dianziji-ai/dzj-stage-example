import { useEffect, useRef, type RefObject } from 'react'
import { hideOpenMarks, renderMarkdown } from '@dianziji/stage'

const CARET = '<span class="tw-caret" aria-hidden="true"></span>'

/**
 * 打字机：把「一截一截到的流」匀速一个字一个字显示出来。
 *  · 基础每秒约 35 字；落后得多就自动加速追上（一次到一大段不会越落越远）。
 *  · 新的 text 只要是旧的延长，就接着打；不是延长（换了一段）就从头打。
 *  · 挂载时直接显示全部（刷新后读回来的旧正文不重打一遍）。
 *  · 点一下直接显示全部。
 *  · 末尾有闪烁光标：正在打字、或 streaming（AI 还在生成）时显示，全部打完就收起。
 *  · markdown：已经显示的那部分按 markdown 渲染（没闭合的 ** / * 先藏起来，看不到星号闪），光标嵌在最后一段的末尾。
 * ★性能：只在显示的字数变了才写 DOM，不走 React 重渲染；光标显隐只改一个属性；scrollEl 给了就跟着滚到底。
 */
export default function Typewriter({ text, streaming = false, markdown = false, scrollEl }: {
  text: string
  /** AI 还在生成：字追上了也留着光标（后面还有） */
  streaming?: boolean
  /** 按 markdown 渲染（SDK 的 renderMarkdown，默认安全） */
  markdown?: boolean
  scrollEl?: RefObject<HTMLElement | null>
}) {
  const box = useRef<HTMLDivElement>(null)
  const shown = useRef(text.length) // 已经显示了几个字（挂载时＝全部）
  const target = useRef(text)
  const raf = useRef(0)
  const live = useRef(streaming)

  useEffect(() => {
    live.current = streaming
    if (!text.startsWith(target.current.slice(0, shown.current))) shown.current = 0 // 不是接着上一段
    target.current = text
    if (raf.current) return // 已经在打了，会自己追上新的长度

    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const backlog = target.current.length - shown.current
      if (backlog <= 0) {
        raf.current = 0
        showCaret()
        return
      }
      // 按时间累计（小数），速度与屏幕刷新率无关；整数字数变了才写 DOM
      const before = Math.floor(shown.current)
      shown.current = Math.min(target.current.length, shown.current + (35 + backlog * 3) * dt)
      if (Math.floor(shown.current) !== before) paint()
      raf.current = requestAnimationFrame(tick)
    }
    paint()
    raf.current = requestAnimationFrame(tick)
    showCaret()
  })

  // ★取消时必须清零：StrictMode 开发环境会「挂载→卸载→再挂载」，只取消不清零，
  //   再挂载时看到编号还在就以为「已经在打」不再启动，正文就卡在挂载那一刻的几个字上。
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current)
      raf.current = 0
    },
    [],
  )

  function paint() {
    const el = box.current
    if (!el) return
    const s = scrollEl?.current
    const atBottom = !s || s.scrollHeight - s.scrollTop - s.clientHeight < 40 // 主人往上翻着看就别把他拽下来
    const prefix = target.current.slice(0, Math.floor(shown.current))
    if (markdown) {
      // 光标塞进最后一个元素里面（最后一段的末尾），不另起一行
      el.innerHTML = renderMarkdown(hideOpenMarks(prefix)).replace(/((?:<\/[a-z0-9]+>)*)$/, `${CARET}$1`) || CARET
    } else {
      el.textContent = prefix
      el.insertAdjacentHTML('beforeend', CARET)
    }
    if (s && atBottom) s.scrollTop = s.scrollHeight
  }

  /** 光标：在打字或 AI 还在生成就显示（只改一个属性，不重渲染） */
  function showCaret() {
    box.current?.setAttribute('data-caret', raf.current || live.current ? 'on' : 'off')
  }

  const skip = () => {
    shown.current = target.current.length
    paint()
  }

  return <div ref={box} onClick={skip} className={`tw ${markdown ? 'md' : ''}`} />
}
