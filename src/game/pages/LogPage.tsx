import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { StageMessage } from '@dianziji/stage'
import { CHAR_NAME, LOGO_URL } from '../content'
import Page from './Page'

/**
 * 记录：对话原文（AI 的完整输出，含分区标签）。聊天式排版：电子姬在左（头像＝logo），玩家在右（头像＝名字首字，署名＝初始设定里的名字），AI 是白卡片。
 * 打开时停在最新一条；往上滚到顶自动加载更早的（每次 20 条），加载完停在原来读的位置，不跳。
 */
export default function LogPage({ items, me, avatar, hasMore, onMore, onBack }: {
  onBack: () => void
  items: { id: number; role: StageMessage['role']; text: string }[]
  me: string
  /** 玩家站内头像（没有就用名字首字） */
  avatar: string
  /** 更早还有 */
  hasMore: boolean
  /** 取更早的一页；false＝没取到（给重试） */
  onMore: () => Promise<boolean>
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const top = useRef<HTMLDivElement>(null)
  const anchor = useRef<number | null>(null) // 加载前「离底部多远」：加载后按它把位置还原
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle')

  // 打开时滚到最新
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  // 前面插进了更早的：保持离底部的距离不变＝眼睛看的那条不动
  const firstId = items[0]?.id
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && anchor.current !== null) {
      el.scrollTop = el.scrollHeight - anchor.current
      anchor.current = null
    }
  }, [firstId])

  const more = async () => {
    const el = scroller.current
    if (!el) return
    anchor.current = el.scrollHeight - el.scrollTop
    setState('loading')
    const ok = await onMore()
    if (!ok) anchor.current = null
    setState(ok ? 'idle' : 'failed')
  }
  const moreRef = useRef(more)
  useEffect(() => {
    moreRef.current = more
  })

  // 顶部哨兵露出来（离顶 200px 内）就取下一页。每次条数变了都重新观察一次：
  // 一页不够撑满屏幕时，哨兵还露着，新观察器一上来就会再触发，直到撑满或取完
  useEffect(() => {
    const el = top.current
    if (!el || !hasMore || state !== 'idle') return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && void moreRef.current(), { root: scroller.current, rootMargin: '200px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, state, firstId])

  return (
    <Page title="对话记录" onBack={onBack} sub="每一轮的原文" scrollRef={scroller}>
      <div className="mx-auto max-w-2xl space-y-3 px-4 pt-2 pb-4">
        <div ref={top} className="flex h-6 items-center justify-center text-[11px] text-[#c2a59c]">
          {state === 'loading' ? (
            '正在翻更早的记录…'
          ) : state === 'failed' ? (
            <button onClick={() => void more()} className="rounded-full border border-pink-200 bg-white px-3 py-0.5 text-[#9a7b72]">
              没加载出来 · 点我重试
            </button>
          ) : hasMore ? (
            '往上滑看更早的'
          ) : items.length ? (
            '— 从这里开始 —'
          ) : null}
        </div>
        {items.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex items-start justify-end gap-2">
              <div className="flex min-w-0 flex-col items-end">
                <div className="mb-1 px-1 text-[11px] text-[#9a7b72]">{me || '你'}</div>
                <div className="max-w-full rounded-2xl rounded-tr-md bg-gradient-to-br from-pink-400 to-rose-400 px-3.5 py-2 text-sm leading-6 break-words whitespace-pre-wrap text-white select-text">
                  {m.text}
                </div>
              </div>
              <PlayerAvatar name={me} avatar={avatar} />
            </div>
          ) : (
            <div key={m.id} className="flex items-start gap-2">
              <img src={LOGO_URL} alt="" width={36} height={36} loading="lazy" decoding="async" className="size-9 shrink-0 rounded-full bg-white ring-2 ring-white shadow-sm" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 px-1 text-[11px] font-semibold text-pink-500">{CHAR_NAME}</div>
                <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-[13px] leading-6 break-words whitespace-pre-wrap shadow-[0_8px_20px_-12px_rgba(236,72,153,0.35)] select-text">
                  {m.text}
                </div>
              </div>
            </div>
          ),
        )}
        {!items.length && <p className="pt-10 text-center text-[#9a7b72]">还没有记录</p>}
      </div>
    </Page>
  )
}
/** 玩家头像：站内头像；没有就是名字的第一个字（没填名字写「你」），粉色渐变圆 */
function PlayerAvatar({ name, avatar }: { name: string; avatar: string }) {
  const [broken, setBroken] = useState(false) // 加载失败就退回首字，不出破图
  if (avatar && !broken) return <img src={avatar} alt="" width={36} height={36} loading="lazy" decoding="async" onError={() => setBroken(true)} className="size-9 shrink-0 rounded-full bg-white object-cover ring-2 ring-white shadow-sm" />
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-pink-300 text-sm font-bold text-white ring-2 ring-white shadow-sm" aria-hidden="true">
      {[...(name || '你')][0]}
    </span>
  )
}
