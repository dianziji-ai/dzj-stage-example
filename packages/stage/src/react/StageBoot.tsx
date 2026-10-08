import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { applySafeArea, createSession, type Session, type SessionOptions, type StageError, type StageSnapshot } from '..'
import { SessionCtx } from './context'
import { preloadImages } from './preload'
import Splash from './Splash'

/**
 * 公共启动外壳（每个舞台都该有）：包在整个 App 外面，「准备好之前」的事都归它——
 *   ① 显示看板娘加载页 ② 等网站给这一局的快照（stage.ready）③ 预加载首屏要用的图（preload 由舞台自己给）
 *   ④ 准备好淡出、把这一局交给 App（useStage 拿）⑤ 出错给原因 + 重试，不白屏。
 * 准备好后建好这一局的会话（createSession），App 里 useStage() 拿全部（一定有值）。安全区也在这里接好（applySafeArea）。
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
  const [step, setStep] = useState('连接网站…')
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
        setStep('连接网站…')
        setProgress(0.15)
        const s = await stage.ready()
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
    setStep('连接网站…')
    setAttempt((n) => n + 1)
  }, [])

  // 安全区：刘海 / home 条的高度由网站量好放在快照里（pt-safe 这些工具类才有值），变了跟着改。作者不用自己调
  useEffect(() => {
    applySafeArea(stage.snapshot()?.safe_area)
    return stage.subscribe((snap, changed) => {
      if (changed.includes('safe_area')) applySafeArea(snap.safe_area)
    })
  }, [stage])

  // 卸载时摘掉会话的监听（StrictMode 挂两次也没事：会话只在启动成功后建一次）
  useEffect(() => () => session?.dispose(), [session])

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
    return { title: '请在网站里打开', detail: import.meta.env.DEV ? '本地开发要在网站里打开：进入这张卡 → 工具行「开发」→ 本地开发，填这个页面的地址。' : '回到电子姬网站，重新进入这张卡。' }
  if (err?.code === 'version') return { title: '版本对不上', detail: err.message }
  if (err?.code === 'network') return { title: '网络开小差了', detail: '网站没有回应，检查一下网络再试试。' }
  if (err?.code === 'maintenance') return { title: '正在维护', detail: err.message || '稍后再来哦。' }
  return { title: '加载失败', detail: err?.message || '出了点问题，再试一次？' }
}
