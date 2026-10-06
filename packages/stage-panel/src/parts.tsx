import { useState, type ReactNode } from 'react'
import { mono, muted } from './ui'

export function Json({ value }: { value: unknown }) {
  return <pre className={mono}>{JSON.stringify(value, null, 2)}</pre>
}

/** 小标题 + 内容（标题右边可以放一个小按钮，比如「复制」） */
export function Field({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className={`mb-1 flex items-center text-[11px] ${muted}`}>
        <span className="flex-1">{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

/** 一行一项的「名 值」表（手机上值会折行，不撑宽） */
export function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className={`${muted} whitespace-nowrap`}>{k}</dt>
          <dd className="[overflow-wrap:anywhere]">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className={`${muted} py-6 text-center`}>{children}</p>
}

/** 头像：加载失败 / 没有头像时用名字首字（不出破图） */
export function Avatar({ src, name, className = 'size-8' }: { src?: string | null; name: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  if (src && !broken) return <img src={src} alt="" decoding="async" onError={() => setBroken(true)} className={`${className} shrink-0 rounded-full bg-sp-code object-cover`} />
  return <span className={`${className} grid shrink-0 place-items-center rounded-full bg-sp-accent-soft font-semibold text-sp-accent`}>{[...(name || '?')][0]}</span>
}

/**
 * 复制按钮。★线上舞台在平台 iframe 沙箱里，剪贴板可能被禁：复制不了就提示手动选中复制（不报错）。
 */
export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setState('ok')
    } catch {
      setState('fail')
    }
    setTimeout(() => setState('idle'), 2000)
  }
  return (
    <button onClick={() => void copy()} className="rounded-full border border-sp-line bg-sp-card px-2 py-0.5 text-[11px] text-sp-muted hover:text-sp-text">
      {state === 'ok' ? '✓ 已复制' : state === 'fail' ? '复制不了，请手动选中' : '复制'}
    </button>
  )
}
