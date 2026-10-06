import { useEffect, useState } from 'react'
import type { StageError } from '@dianziji/stage'

/** 框架给的错误（useStage().error）：code 决定给什么按钮，retry＝能「再说一次」的那句话 */
export type NoticeError = { error: StageError; retry?: string }

/**
 * 出错提示（对话框上方）：按错误类型给人话 + 对应的按钮。
 *   能量不足 → 去充值 · 连接断了 / 上游出错 → 再说一次（没写完的不扣费）
 *   太频繁 → 倒计时自己消失 · 她还在说 → 2.5 秒自己消失 · 维护 / 其他 → 知道了
 */
const TEXT: Record<string, string> = {
  insufficient: '能量不够啦～充值后再继续和她聊',
  network: '连接断了一下，她没听到。这一轮没扣能量',
  stream: '她走神了一下，这一轮没扣能量',
  busy: '她还没说完哦，等一下～',
  maintenance: '平台在维护，稍后再来',
  unauthorized: '登录过期了，回网站重新进入这张卡',
  invalid: '这句话发不了',
}

export default function ErrorNotice({ error, onRetry, onClose, topupUrl }: {
  error: NoticeError
  onRetry: (text: string) => void
  onClose: () => void
  topupUrl: string
}) {
  const { code, message, retryAfter } = error.error
  const [left, setLeft] = useState(code === 'rate_limited' ? (retryAfter ?? 5) : 0)

  // 会自己好的错误：到点自动收起
  useEffect(() => {
    if (code === 'busy') {
      const t = setTimeout(onClose, 2500)
      return () => clearTimeout(t)
    }
    if (code !== 'rate_limited') return
    const t = setInterval(() => setLeft((n) => (n <= 1 ? 0 : n - 1)), 1000)
    return () => clearInterval(t)
  }, [code, onClose])
  useEffect(() => {
    if (code === 'rate_limited' && left === 0) onClose()
  }, [left, code, onClose])

  const text = code === 'rate_limited' ? `说得太快啦，${left} 秒后再试` : TEXT[code] || message || '出了点问题'
  const btn = 'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold'

  return (
    <div role="alert" className="glass-strong mb-2 flex shrink-0 animate-fade-in items-center gap-3 rounded-2xl border-rose-300/50 px-4 py-2.5 text-[13px]">
      <span className="text-base">{code === 'insufficient' ? '⚡' : code === 'rate_limited' || code === 'busy' ? '⏳' : '⚠️'}</span>
      <span className="min-w-0 flex-1 leading-snug">{text}</span>
      {code === 'insufficient' && (
        <a href={topupUrl} target="_blank" rel="noreferrer" className={`${btn} bg-gradient-to-br from-amber-300 to-orange-400 text-[#5a2a0a]`}>
          去充值
        </a>
      )}
      {error.retry && (
        <button onClick={() => onRetry(error.retry!)} className={`${btn} bg-gradient-to-br from-pink-400 to-rose-400 text-white`}>
          再说一次
        </button>
      )}
      {code !== 'busy' && code !== 'rate_limited' && (
        <button onClick={onClose} aria-label="关闭" className="shrink-0 px-1 text-white/60">
          ✕
        </button>
      )}
    </div>
  )
}
