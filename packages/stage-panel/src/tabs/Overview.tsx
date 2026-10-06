import { useState, type ReactNode } from 'react'
import type { StageClient, StageSnapshot } from '@dianziji/stage/client'
import { muted, shortModel } from '../ui'
import { Avatar, Rows } from '../parts'

/** 概览：这是哪张卡、哪一局（在网站打开）、用的什么模型、已载入的回复花了多少；开发模式多出 token / 结构信息 */
export default function Overview({ stage, snap, dev }: { stage: StageClient; snap: StageSnapshot; dev: boolean }) {
  const t = stage.tokenInfo()
  const [now] = useState(() => Date.now()) // 打开那一刻算剩余时间，渲染时别反复取
  const spent = snap.history.reduce((n, m) => n + (m.spend?.cost ?? 0), 0)
  const turns = snap.history.filter((m) => m.spend).length

  const rows: [string, ReactNode][] = [
    ['卡', snap.card.name || snap.card.id],
    [
      '这一局',
      t ? (
        // 站内这一局的聊天页：看平台那边的显示、改设定、重新生成
        <a key="chat" href={stage.siteUrl(`/chat/${snap.card.id}?s=${t.sessionId}`)} target="_blank" rel="noreferrer" className="text-sp-accent underline underline-offset-2">
          #{t.sessionId} 在网站打开 ↗
        </a>
      ) : (
        '—'
      ),
    ],
    ['模型', t ? shortModel(t.model) : '—'],
    ['消耗', turns ? `最近 ${turns} 轮共 ⚡${spent.toLocaleString()} 能量` : '还没有'],
  ]
  if (dev) {
    const left = t ? Math.round((t.expiresAt.getTime() - now) / 3600_000) : 0
    rows.push(
      ['卡 id', snap.card.id],
      ['完整模型', t?.model ?? '—'],
      ['线路', t?.channel ?? '—'],
      ['token 过期', t ? `${t.expiresAt.toLocaleString()}（${left > 0 ? `还剩约 ${left} 小时` : '已过期'}）` : 'token 解析不了'],
      ['网站', snap.site],
      ['图床', snap.asset_base],
      ['分区', `${snap.slots.length} 个`],
      ['存档结构', snap.state_schema ? '已定义' : '没定义（不能存档）'],
      ['生成中', snap.streaming ? `是（${snap.streaming.turn_id}）` : '否'],
    )
  }
  return (
    <>
      {snap.user && (
        <div className="flex items-center gap-3 rounded-2xl border border-sp-line bg-sp-card p-3">
          <Avatar key={snap.user.avatar} src={snap.user.avatar} name={snap.user.name || snap.user.username} className="size-10" />
          <div className="min-w-0">
            <div className="truncate font-medium">{snap.user.name || snap.user.username}</div>
            <div className={`truncate text-[11px] ${muted}`}>
              @{snap.user.username} · ID {snap.user.id}
            </div>
          </div>
        </div>
      )}
      <Rows rows={rows} />
      {dev && <p className={`${muted} text-[11px]`}>开发模式（开发 token 或本地开发）：多出上面这些 token 细节。</p>}
    </>
  )
}
