import { useEffect, useState } from 'react'
import type { StageClient, StageSnapshot } from '@dianziji/stage/client'
import Gallery from './tabs/Gallery'
import Guide from './tabs/Guide'
import Overview from './tabs/Overview'
import Save from './tabs/Save'
import Setup from './tabs/Setup'
import Slots from './tabs/Slots'
import { muted } from './ui'
import { Avatar, Empty } from './parts'

/** 所有人都看得到全部标签（系统内置的预览）、都能改存档；本地开发（快照 meta.dev，或传 dev）只多出结构细节和消息 id、设定 key 这类开发信息 */
const TABS = [
  { id: 'overview', label: '概览', icon: '◎' },
  { id: 'setup', label: '初始设定', icon: '✎' },
  { id: 'gallery', label: '图册', icon: '▣' },
  { id: 'save', label: '存档', icon: '◆' },
  { id: 'slots', label: '分区', icon: '▦' },
  { id: 'guide', label: '指南', icon: '？' },
] as const
type TabId = (typeof TABS)[number]['id']

/**
 * 面板本体（StagePanel 第一次打开时才下载）：电脑居中弹窗（左侧竖排标签，点遮罩关），手机全屏（顶部让刘海、底部让 home 条）。
 * 数据就是网站推来的快照（stage.snapshot / subscribe），打开就是此刻的样子、之后跟着变。Esc 关闭。
 */
export default function Panel({ stage, dev: devProp, title, onClose }: { stage: StageClient; dev?: boolean; title: string; onClose: () => void }) {
  const [base, setBase] = useState<StageSnapshot | null>(() => stage.snapshot())
  // 存档：快照里的只是进来时那份；之后存过（游戏自己存、本局面板改）以存好的为准
  const [saved, setSaved] = useState<{ v: StageSnapshot['save'] } | null>(null)
  const [tab, setTab] = useState<TabId>('overview')

  useEffect(
    () =>
      stage.subscribe((s, changed) => {
        setBase(s)
        if (changed.includes('save')) setSaved(null) // 网站推了新存档：以它为准
      }),
    [stage],
  )
  useEffect(
    () =>
      stage.on((e) => {
        if (e.type === 'save') setSaved({ v: e.state })
      }),
    [stage],
  )
  const snap = base && saved ? { ...base, save: saved.v } : base

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const dev = devProp || !!snap?.meta.dev

  const nav = (vertical: boolean) =>
    TABS.map((t) => {
      const on = t.id === tab
      return (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          aria-current={on ? 'page' : undefined}
          className={
            vertical
              ? `flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors ${on ? 'bg-sp-accent font-medium text-sp-on-accent' : 'text-sp-muted hover:bg-sp-card hover:text-sp-text'}`
              : `shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${on ? 'bg-sp-accent text-sp-on-accent' : 'bg-sp-card text-sp-muted hover:text-sp-text'}`
          }
        >
          {vertical && <span className="w-4 text-center text-[13px] opacity-80">{t.icon}</span>}
          {t.label}
        </button>
      )
    })

  return (
    // 手机：全屏（让刘海 / home 条）· 电脑：居中弹窗（左侧竖排标签 + 右侧内容），点遮罩或 Esc 关
    <div className="fixed inset-0 z-[90] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="关闭" tabIndex={-1} onClick={onClose} className="absolute inset-0 hidden animate-sp-fade cursor-default bg-black/45 lg:block" />
      <section className="relative flex size-full flex-col bg-sp-bg text-[13px] text-sp-text select-text motion-safe:animate-sp-in lg:h-[min(720px,88dvh)] lg:w-[min(920px,92vw)] lg:overflow-hidden lg:rounded-3xl lg:border lg:border-sp-line lg:shadow-[0_30px_80px_-20px_rgb(0_0_0/0.45)] lg:motion-safe:animate-sp-pop">
        <header className="shrink-0 border-b border-sp-line pt-[var(--safe-top,env(safe-area-inset-top))] pr-[var(--safe-right,env(safe-area-inset-right))] pl-[var(--safe-left,env(safe-area-inset-left))] lg:p-0">
          <div className="flex h-14 items-center gap-2.5 px-4 lg:h-16 lg:px-6">
            {snap?.user && <Avatar key={snap.user.avatar} src={snap.user.avatar} name={snap.user.name || snap.user.username} className="size-8 text-sm lg:size-9" />}
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold lg:text-base">{title}</div>
              {snap && <div className={`truncate text-[11px] ${muted}`}>{snap.card.name}{snap.user ? ` · ${snap.user.name || snap.user.username}` : ''}</div>}
            </div>
            <button onClick={onClose} aria-label="关闭" className="grid size-9 place-items-center rounded-full text-lg text-sp-muted hover:bg-sp-card hover:text-sp-text">
              ✕
            </button>
          </div>
          {/* 手机：标签横排可滑 */}
          <nav className="flex gap-1.5 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] lg:hidden">{nav(false)}</nav>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* 电脑：左侧竖排标签 */}
          <nav className="hidden w-44 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-sp-line p-3 lg:flex">{nav(true)}</nav>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pr-[var(--safe-right,env(safe-area-inset-right))] pb-[var(--safe-bottom,env(safe-area-inset-bottom))] pl-[var(--safe-left,env(safe-area-inset-left))]">
            <div className="space-y-3 p-4 lg:p-6">
              {!snap ? (
                <Empty>还没连上网站…</Empty>
              ) : tab === 'overview' ? (
                <Overview stage={stage} snap={snap} dev={dev} />
              ) : tab === 'setup' ? (
                <Setup snap={snap} dev={dev} />
              ) : tab === 'save' ? (
                <Save stage={stage} snap={snap} />
              ) : tab === 'gallery' ? (
                <Gallery stage={stage} />
              ) : tab === 'guide' ? (
                <Guide stage={stage} snap={snap} />
              ) : (
                <Slots snap={snap} />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
