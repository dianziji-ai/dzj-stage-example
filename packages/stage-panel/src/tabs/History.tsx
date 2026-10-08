import { useState } from 'react'
import { StageError, type StageClient, type StageSnapshot, type StageSpend } from '@dianziji/stage/client'
import { btnSoft, clock, mono, muted, shortModel, tokens } from '../ui'

/**
 * 历史：每一轮的原文 + 这一轮花了多少（同聊天页「本轮消耗」）。
 * 就是快照里的历史；「更早的」请网站往前读，读到的一起推过来。
 */
export default function History({ stage, snap, dev }: { stage: StageClient; snap: StageSnapshot; dev: boolean }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const list = snap.history
  const more = snap.has_more
  const total = list.reduce((n, m) => n + (m.spend?.cost ?? 0), 0)

  // 请网站读更早的：读到的随快照的 history 推过来（面板跟着刷新）
  const loadMore = async () => {
    if (loading) return
    setLoading(true)
    setErr('')
    try {
      await stage.older()
    } catch (e) {
      setErr(e instanceof StageError ? e.message : '加载失败，再试一次')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <p className={muted}>
        {list.length} 条{more ? '（更早还有）' : ''} · 这些回复共 ⚡{total.toLocaleString()} 能量
      </p>
      {more && (
        <button className={`${btnSoft} w-full`} onClick={() => void loadMore()} disabled={loading}>
          {loading ? '加载中…' : '↑ 更早的 20 条'}
        </button>
      )}
      {err && <p className="text-sp-danger">{err}</p>}
      {list.map((m) => (
        <details key={m.id} className="group min-w-0 rounded-xl border border-sp-line bg-sp-card">
          <summary className={`flex list-none flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-2 [&::-webkit-details-marker]:hidden ${muted}`}>
            <span className={m.role === 'user' ? 'font-medium text-sp-accent' : 'font-medium text-sp-text'}>{m.role === 'user' ? '你' : m.kind === 'opening' ? '开场' : 'AI'}</span>
            <span className="text-[11px]">
              {dev ? `#${m.id} · ` : ''}
              {m.content.length} 字
            </span>
            {m.status === 'error' && <span className="text-[11px] text-sp-danger">{m.spend ? '断流' : '失败'}</span>}
            <span className="ml-auto flex items-center gap-2 text-[11px] tabular-nums">
              {m.spend && (
                <span>
                  ⚡{m.spend.cost.toLocaleString()} · {shortModel(m.spend.model)}
                </span>
              )}
              {m.created_at && <span>{clock(m.created_at)}</span>}
            </span>
          </summary>
          <div className="space-y-2 border-t border-sp-line p-2.5">
            {m.spend && <SpendTable spend={m.spend} />}
            <pre className={`${mono} max-h-80 overflow-y-auto overscroll-contain`}>{m.content}</pre>
          </div>
        </details>
      ))}
    </>
  )
}

/** 本轮消耗明细（同聊天页闪电浮层）：模型、线路、输入 / 输出各多少 token、各花多少能量 */
function SpendTable({ spend }: { spend: StageSpend }) {
  const cost = (n: number | null) => (n == null ? '' : ` · ⚡${n.toLocaleString()}`)
  const rows: [string, string][] = [
    ['模型', spend.model ?? '—'],
    ['线路', spend.channel ?? '—'],
    ['输入', spend.in_tokens == null ? '—' : `${tokens(spend.in_tokens)} token${cost(spend.in_cost)}`],
    ['输出', `${tokens(spend.out_tokens)} token${cost(spend.out_cost)}`],
    ['合计', `⚡${spend.cost.toLocaleString()} 能量`],
  ]
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 px-1 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className={muted}>{k}</dt>
          <dd className="font-mono [overflow-wrap:anywhere]">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
