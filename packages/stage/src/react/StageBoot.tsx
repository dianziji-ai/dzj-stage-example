import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createSession, watchViewport, type Session, type SessionOptions, type StageError, type StageSnapshot } from '..'
import { SessionCtx } from './context'
import { preloadImages } from './preload'
import Splash from './Splash'

/**
 * 公共启动外壳（每个舞台都该有）：包在整个 App 外面，「准备好之前」的事都归它——
 *   ① 显示看板娘加载页 ② 读这一局（stage.load）③ 预加载首屏要用的图（preload 由舞台自己给）
 *   ④ 准备好淡出、把这一局交给 App（useStage 拿）⑤ 出错给原因 + 重试，不白屏。
 * 准备好后建好这一局的会话（createSession），App 里 useStage() 拿全部（一定有值，不用再自己 load）。
 * 游戏规则从这里传进去（都可选）：normalize 存档补默认、onTurn 一轮写完怎么改存档。
 *
 *   <StageBoot stage={stage} preload={(snap) => [背景图, 立绘…]} onTurn={settle}>
 *     <App />
 *   </StageBoot>
 */
/** 加载页至少露这么久，免得一闪而过 */
const MIN_MS = 700

export default function StageBoot<S>({ stage, preload, normalize, onTurn, saveDelay, version, children }: Omit<SessionOptions<S>, 'snapshot'> & {
  /** 首屏要先下载好的图（背景、立绘…）；不给就只读数据 */
  preload?: (snap: StageSnapshot) => string[]
  /** 版本 / 构建号，显示在加载页底部（官方例子：打包时自动生成「BUILD 时间戳」，见 vite.config.ts） */
  version?: string
  children: ReactNode
}) {
  const [session, setSession] = useState<Session<S> | null>(null)
  const [step, setStep] = useState('连接舞台…')
  const [progress, setProgress] = useState(0.05)
  const [error, setError] = useState<{ title: string; detail: string } | null>(null)
  const [ready, setReady] = useState(false) // App 可以挂了（加载页开始淡出）
  const [gone, setGone] = useState(false) // 加载页淡完，拿掉
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    const t0 = performance.now()
    ;(async () => {
      try {
        setStep('读取存档…')
        setProgress(0.15)
        const s = await stage.load({ limit: 50 })
        if (!alive) return
        setProgress(0.4)
        const urls = preload?.(s) ?? []
        if (urls.length) {
          await preloadImages(urls, (done, total) => {
            if (!alive) return
            setStep(`加载素材 ${done}/${total}`)
            setProgress(0.4 + 0.55 * (done / Math.max(1, total)))
          })
        }
        const wait = MIN_MS - (performance.now() - t0)
        if (wait > 0) await new Promise((r) => setTimeout(r, wait))
        if (!alive) return
        setProgress(1)
        setStep('准备好啦！')
        setSession(createSession<S>({ stage, snapshot: s, normalize, onTurn, saveDelay }))
        setReady(true)
      } catch (e) {
        if (alive) setError(explain(e))
      }
    })()
    return () => {
      alive = false
    }
    // preload / 游戏规则是舞台给的纯函数，只在启动（和重试）时用一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  // 加载页淡出 500ms 后拿掉（淡出期间 App 已经在底下挂好了）
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setGone(true), 520)
    return () => clearTimeout(t)
  }, [ready])

  const retry = useCallback(() => {
    setError(null)
    setProgress(0.05)
    setStep('连接舞台…')
    setAttempt((n) => n + 1)
  }, [])

  // 安全区：线上在平台 iframe 里，刘海 / home 条的高度由平台推进来（pt-safe 这些工具类才有值）。作者不用自己调
  useEffect(() => watchViewport(), [])

  // 接上刷新前还在生成的那一轮（StrictMode 挂两次：卸载时停、再挂再接，会从头回放）
  useEffect(() => session?.start(), [session])

  return (
    <>
      {session && <SessionCtx.Provider value={session as Session<unknown>}>{children}</SessionCtx.Provider>}
      {!gone && <Splash step={step} progress={progress} error={error} onRetry={retry} leaving={ready} version={version} />}
    </>
  )
}

/** 出错原因翻成人话 */
function explain(e: unknown): { title: string; detail: string } {
  const err = e as StageError
  if (err?.code === 'unauthorized')
    return { title: '进不去这一局', detail: import.meta.env.DEV ? 'token 无效或过期了：回网站「开发」重新生成一个，贴进 .env 再刷新。' : '登录过期了，回到网站重新进入这张卡试试。' }
  if (err?.code === 'network') return { title: '网络开小差了', detail: '连不上舞台，检查一下网络再试试。' }
  if (err?.code === 'maintenance') return { title: '正在维护', detail: err.message || '稍后再来哦。' }
  return { title: '加载失败', detail: err?.message || '出了点问题，再试一次？' }
}
