import { useEffect, useRef, useState } from 'react'
import { CHARS_PER_SEC } from './core'
import { settingsStore, type SettingsStore } from './store'
import { useSettings } from './useSettings'

export type Typewriter = {
  /** 此刻该显示的那一截 */
  shown: string
  /** 这句打完了吗 */
  done: boolean
  /** 一下补完（玩家打字中点了一下：先补完这句，再点才翻页） */
  finish: () => void
}

/** 单帧最多算 80ms：切回标签页 / 卡了一下时不一口气跳一大截 */
const MAX_FRAME_MS = 80

/**
 * 逐字打出一句（速度＝设置里的「文本速度」，瞬间＝直接全出）。text 换了就从头打。
 * ★按动画帧推进，只在多出了字时才 setState；生成中这句还在变长（新的 text 以旧的开头）时接着打，不从头。
 * ★系统开了「减少动态效果」或设置里「动效：减少」时也照常打字（打字是阅读节奏，不是装饰动效）；想关就把文本速度调成「瞬间」。
 */
export function useTypewriter(text: string, store: SettingsStore = settingsStore): Typewriter {
  const [{ textSpeed }] = useSettings(store)
  const cps = CHARS_PER_SEC[textSpeed]
  const chars = Array.from(text)
  const [state, setState] = useState({ text, n: cps === Infinity ? chars.length : 0 })
  // 换了一句：接着打（变长的同一句）或从头打（React「根据上一次渲染调整状态」写法）
  if (state.text !== text) setState({ text, n: cps === Infinity ? chars.length : text.startsWith(state.text) ? state.n : 0 })
  const n = Math.min(state.n, chars.length)
  const done = cps === Infinity || n >= chars.length

  const acc = useRef(0)
  useEffect(() => {
    if (done) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      acc.current += Math.min(MAX_FRAME_MS, now - last) * (cps / 1000)
      last = now
      const add = Math.floor(acc.current)
      if (add > 0) {
        acc.current -= add
        setState((s) => (s.text === text ? { text, n: Math.min(Array.from(text).length, s.n + add) } : s))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [done, cps, text])

  return { shown: done ? text : chars.slice(0, n).join(''), done, finish: () => setState({ text, n: chars.length }) }
}
