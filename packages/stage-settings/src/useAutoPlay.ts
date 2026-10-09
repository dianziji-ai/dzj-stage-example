import { useEffect, useRef, useState } from 'react'
import { delayFor } from './core'
import { settingsStore, type SettingsStore } from './store'
import { useSettings } from './useSettings'

export type UseAutoPlayOptions = {
  /** 正在显示的这一句（算等多久用） */
  text: string
  /** 后面还有下一句吗。★最后一句（选项出来了）、或者 AI 还在写、已经播到最新一句时传 false：原地等，绝不替玩家选 */
  canAdvance: boolean
  /** 翻到下一句（舞台自己的翻页函数） */
  onNext: () => void
  /** 这句的字打完了吗（用了 useTypewriter 就传它的 done；没有打字效果不用传）：打完才开始计时 */
  ready?: boolean
  /** 舞台自己要暂停的时候（打开了输入框 / 弹窗、在回看旧的一轮、对话框藏起来、切到别的页面……）传 true */
  paused?: boolean
  store?: SettingsStore
}

export type AutoPlayState = {
  /** 自动播放开着吗（玩家的开关） */
  on: boolean
  toggle: () => void
  /** 此刻正在倒计时（开着、没暂停、字打完了、还有下一句、页面看得见） */
  running: boolean
  /** 这一句要等多少毫秒（倒计时动画的时长） */
  duration: number
  /** 给倒计时动画当 key：换一句 / 换时长就从头播（暂停时不渲染，恢复时重新挂上也是从头播） */
  cycle: string
}

/** 页面看不看得见（切到别的标签页 / 锁屏时暂停） */
function usePageVisible(): boolean {
  const [v, setV] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')
  useEffect(() => {
    const on = () => setV(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return v
}

/**
 * 自动播放的计时：到点调一次 onNext。
 * ★换了一句（text 变了）、玩家自己翻了页、从暂停里回来，都从头计时；onNext 用最新的那个（不因舞台每次渲染都新建函数而重新计时）。
 */
export function useAutoPlay({ text, canAdvance, onNext, ready = true, paused = false, store = settingsStore }: UseAutoPlayOptions): AutoPlayState {
  const [{ autoPlay }, set] = useSettings(store)
  const visible = usePageVisible()
  const running = autoPlay.on && !paused && ready && canAdvance && visible
  const duration = delayFor(text, autoPlay)
  const next = useRef(onNext)
  useEffect(() => {
    next.current = onNext
  }, [onNext])

  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => next.current(), duration)
    return () => clearTimeout(t)
  }, [running, duration, text])

  return { on: autoPlay.on, toggle: () => set({ autoPlay: { on: !autoPlay.on } }), running, duration, cycle: `${duration}:${text}` }
}
