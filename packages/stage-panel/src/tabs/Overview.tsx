import type { ReactNode } from 'react'
import type { StageClient, StageSnapshot } from '@dianziji/stage/client'
import { muted, shortModel } from '../ui'
import { Avatar, Rows } from '../parts'

/** 概览：这是哪张卡、用的什么模型、已载入的回复花了多少；「切到对话模式」去网站看这一局。开发模式多出结构信息 */
export default function Overview({ stage, snap, dev }: { stage: StageClient; snap: StageSnapshot; dev: boolean }) {
  const spent = snap.history.reduce((n, m) => n + (m.spend?.cost ?? 0), 0)
  const turns = snap.history.filter((m) => m.spend).length

  const rows: [string, ReactNode][] = [
    ['卡', snap.card.name || snap.card.id],
    [
      '这一局',
      // 舞台本来就在网站里：切到对话模式就能看平台那边的显示、改设定、回溯
      <button key="chat" onClick={() => stage.open('chat')} className="text-sp-accent underline underline-offset-2">
        切到对话模式看这一局
      </button>,
    ],
    ['模型', snap.meta.model ? shortModel(snap.meta.model) : '—'],
    ['消耗', turns ? `最近 ${turns} 轮共 ⚡${spent.toLocaleString()} 能量` : '还没有'],
  ]
  if (dev) {
    rows.push(
      ['卡 id', snap.card.id],
      ['完整模型', snap.meta.model || '—'],
      ['线路', snap.meta.channel || '—'],
      ['网站', snap.site],
      ['图床', snap.asset_base],
      ['分区', `${snap.slots.length} 个`],
      ['存档结构', snap.state_schema ? '已定义' : '没定义（不能存档）'],
      ['生成中', snap.live ? '是' : '否'],
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
      {dev && <p className={`${muted} text-[11px]`}>本地开发：多出上面这些结构信息。</p>}
    </>
  )
}
