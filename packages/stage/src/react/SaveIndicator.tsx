import { useContext, useEffect, useState } from 'react'
import type { Saver } from '..'
import { SessionCtx } from './context'
import { useSaveStatus } from './useSaveStatus'

/** 刚存好的那 2 秒亮「✓ 已保存」 */
const FRESH_MS = 2000

/**
 * 保存指示器 + 手动保存按钮（一颗小胶囊，放在页面角落）：
 *   正在保存… → ✓ 已保存（2 秒后退回平时）→ 平时是「💾 保存」，点一下立刻存
 *   没存上：「⚠ 没存上 · 重试」，点了再存一次
 * quiet（安静模式，手机上不想常驻一颗按钮时用）：平时什么都不显示，只在「保存中 / 刚存好 / 没存上」时冒一个小图标；
 *   没存上时一直亮着，点了重试。手动保存另外放（比如菜单里调 useStageActions().saveNow）。
 * 在 StageBoot 里面不用传 saver（用这一局会话的存档器）。外观默认用 sp-* 主题变量，className 可以整个换掉。
 * ★性能：只在状态变化时重渲染；转圈只动 transform。
 */
export default function SaveIndicator({ saver: own, quiet = false, className = 'border border-sp-line bg-sp-card/90 text-sp-text shadow-sm' }: {
  saver?: Saver
  /** 安静模式：平时不显示，只在保存中 / 刚存好 / 没存上时冒一个小图标 */
  quiet?: boolean
  className?: string
}) {
  const session = useContext(SessionCtx)
  const saver = own ?? session?.saver
  if (!saver) throw new Error('SaveIndicator 要在 <StageBoot> 里面用，或者传 saver')
  const st = useSaveStatus(saver)
  // 哪一次的「已保存」已经亮够了（记那次的时间戳）：新存好一次 st.at 就变，又会亮 2 秒
  const [faded, setFaded] = useState(0)
  const fresh = st.state === 'saved' && faded !== st.at

  useEffect(() => {
    if (st.state !== 'saved') return
    const at = st.at
    const t = setTimeout(() => setFaded(at), FRESH_MS)
    return () => clearTimeout(t)
  }, [st.state, st.at])

  const look =
    st.state === 'saving'
      ? { icon: <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />, text: '正在保存…' }
      : st.state === 'error'
        ? { icon: <span>⚠</span>, text: '没存上 · 重试' }
        : st.state === 'saved' && fresh
          ? { icon: <span>✓</span>, text: '已保存' }
          : { icon: <span>💾</span>, text: '保存' }

  if (quiet) {
    if (st.state !== 'saving' && st.state !== 'error' && !fresh) return null
    return (
      <button
        onClick={() => saver.saveNow()}
        disabled={st.state !== 'error'}
        aria-live="polite"
        aria-label={st.state === 'error' ? '没存上，点一下重试' : st.state === 'saving' ? '正在保存' : '已保存'}
        className={`grid size-8 animate-[toast-in_0.2s_ease-out] place-items-center rounded-full text-sm disabled:cursor-default ${st.state === 'error' ? 'ring-2 ring-sp-danger' : ''} ${className}`}
      >
        {st.state === 'saving' ? <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : st.state === 'error' ? '⚠' : '✓'}
      </button>
    )
  }

  return (
    <button
      onClick={() => saver.saveNow()}
      disabled={st.state === 'saving'}
      aria-live="polite"
      title={st.at ? `上次保存：${new Date(st.at).toLocaleTimeString()}` : '保存'}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity disabled:cursor-default ${st.state === 'error' ? 'ring-2 ring-sp-danger' : ''} ${st.state === 'idle' || (st.state === 'saved' && !fresh) ? 'opacity-70 hover:opacity-100' : ''} ${className}`}
    >
      {look.icon}
      {look.text}
    </button>
  )
}
