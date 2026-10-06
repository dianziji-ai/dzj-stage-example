import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { StageMessage } from '@dianziji/stage'
import { PLUSHIES, plushUrl, RARITY_LABEL, type PlushId } from '../claw/data'
import { Icon } from '../components/icons'
import { showTip } from './tipStore'
import { CG_NAMES, CHAR_NAME, LOGO_URL, MAP_URL, PLACES, withCall, type PlaceId } from './content'

/** 游玩以外的页面：大标题 + 一句副标题 + 可滚内容（底部菜单由 App 接在下面）。底色是 gal-paper（静态渐变）。 */
export function Page({ title, sub, action, scrollRef, onBack, children }: {
  title: string
  sub: string
  action?: ReactNode
  scrollRef?: RefObject<HTMLDivElement | null>
  /** 左上角返回（回游玩页） */
  onBack: () => void
  children: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col pt-safe px-safe">
      <header className="mx-auto w-full max-w-3xl shrink-0 px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          {/* 返回：手机电脑一样大（40px 好点），白底小圆钮 */}
          <button onClick={onBack} aria-label="返回" className="-ml-1 grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#9a7b72] shadow-[0_4px_12px_-6px_rgba(236,72,153,0.45)] active:scale-95">
            <Icon name="back" className="size-5" />
          </button>
          <h1 className="flex-1 text-xl font-bold tracking-wide">{title}</h1>
          {action}
        </div>
        <p className="mt-0.5 pl-[46px] text-xs text-[#9a7b72]">{sub}</p>
      </header>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  )
}

/** 地图：白相框里的小镇地图 + 地点胶囊（地点全部开放）；当前位置粉色；生成中不能点。 */
export function MapPage({ focus, here, busy, call, line, onGo, onBack }: {
  /** 要高亮的地点（从提示「去电玩城」过来时跳动一下） */
  focus?: PlaceId | null
  /** 出发时替玩家说的那句（确认框里原样引用，说的就是发的） */
  line: (id: PlaceId) => string
  here: PlaceId; busy: boolean; call: string; onGo: (id: PlaceId) => void; onBack: () => void }) {
  return (
    <Page title="地图" onBack={onBack} sub={busy ? '她正在说话，等一下再走吧～' : '今天想和电子姬去哪儿约会呢？'}>
      <div className="mx-auto w-full max-w-[min(100%,70dvh)] px-4 pt-2 pb-4">
        <div className="rounded-[28px] bg-white p-2 shadow-[0_14px_40px_-12px_rgba(236,72,153,0.35)]">
          <div className="relative aspect-square overflow-hidden rounded-[22px] bg-[#e9f5df]">
            <img src={MAP_URL} alt="" decoding="async" className="size-full object-cover" />
            {PLACES.map((p) => {
              const cur = p.id === here
              const hot = p.id === focus && !cur
              return (
                <button
                  key={p.id}
                  disabled={cur}
                  onClick={() => {
                    if (busy) return showTip({ icon: '💬', title: '她还在说话呢', text: '等她说完再一起出发吧～' })
                    // ★出发＝替玩家发一句话（AI 接着写这段路上的剧情，消耗一轮能量）：先确认，别误点就扣
                    const name = withCall(p.name, call)
                    showTip({
                      icon: '🗺️',
                      title: `和电子姬一起去${name}？`,
                      text: `会替你说一句「${line(p.id).replace(/^（|）$/g, '')}」，\n她会接着写路上和到了以后的剧情。`,
                      note: '⚡ 算一轮对话，会消耗能量',
                      action: { label: '出发！', onClick: () => onGo(p.id) },
                      dismiss: '再想想',
                    })
                  }}
                  style={{ left: `${p.at[0]}%`, top: `${p.at[1]}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${hot ? 'z-10 animate-bounce ring-4 ring-pink-300/80' : ''} px-3 py-1.5 text-xs font-semibold whitespace-nowrap shadow-md transition-transform ${
                    cur
                      ? 'bg-gradient-to-br from-pink-400 to-rose-500 text-white ring-2 ring-white'
                      : 'border-2 border-pink-200 bg-white text-[#4a2f2a] active:scale-95'
                  }`}
                >
                  {cur ? `📍 ${withCall(p.name, call)}` : withCall(p.name, call)}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Page>
  )
}

/** 图册：白相框 + 名字；没解锁的是小鸡剪影 + 编号（不加载图） */
export function GalleryPage({ unlocked, url, onOpen, collection, claw, onBack }: {
  onBack: () => void
  unlocked: number[]
  url: (n: number) => string
  onOpen: (n: number) => void
  collection: Partial<Record<PlushId, number>>
  /** 去抓娃娃：label＝按钮字（「去抓娃娃」/「去电玩城」…），go＝点了做什么（进机器 / 开地图 / 弹提示） */
  claw: { label: string; go: () => void }
}) {
  const got = PLUSHIES.filter((p) => (collection[p.id] ?? 0) > 0).length
  return (
    <Page title="回忆图册" onBack={onBack} sub={`已收集 ${unlocked.length} / 8 · 和她一起的每个瞬间`}>
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 px-4 pt-2 pb-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => {
          const open = unlocked.includes(n)
          return (
            <button
              key={n}
              disabled={!open}
              onClick={() => onOpen(n)}
              className="rounded-2xl bg-white p-1.5 text-left shadow-[0_8px_20px_-10px_rgba(236,72,153,0.4)] active:scale-[0.98] disabled:active:scale-100"
            >
              {open ? (
                <img src={url(n)} alt="" loading="lazy" decoding="async" className="aspect-video w-full rounded-xl object-cover" />
              ) : (
                <div className="grid aspect-video w-full place-items-center rounded-xl bg-[repeating-linear-gradient(135deg,#fff3e3_0_10px,#ffeef3_10px_20px)] text-3xl opacity-80">🐣</div>
              )}
              <div className="flex items-center justify-between px-1.5 pt-1.5 pb-0.5 text-xs">
                <span className={open ? 'font-semibold' : 'text-[#c2a59c]'}>{open ? CG_NAMES[n - 1] : '还没解锁'}</span>
                <span className="text-[#c2a59c]">No.{n}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* 娃娃收藏柜（电玩城抓娃娃机抓到的；没抓到的是剪影，点了提示去哪儿抓） */}
      <div className="mx-auto flex max-w-3xl items-baseline gap-2 px-5 pt-2 pb-1">
        <span className="text-sm font-bold">🧸 娃娃收藏柜</span>
        <span className="text-xs text-[#9a7b72]">
          {got} / {PLUSHIES.length}
        </span>
      </div>
      {got < PLUSHIES.length && (
        <div className="mx-auto max-w-3xl px-4 pt-1">
          {/* 收集引导：街机风小横幅 */}
          <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-100 bg-gradient-to-r from-amber-50 to-pink-50 p-2.5 pr-3">
            <img src={plushUrl('goldchick')} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 animate-[wiggle_1.8s_ease-in-out_infinite] object-contain" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold">去电玩城抓娃娃！</div>
              <div className="text-[11px] leading-snug text-[#9a7b72]">小鸡抓抓乐里还有 {PLUSHIES.length - got} 只没抓到，金色小鸡王最难抓哦</div>
            </div>
            <button
              onClick={claw.go}
              className="shrink-0 rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 px-3.5 py-2 text-xs font-black text-white shadow-[0_3px_0_#9a3412] [text-shadow:0_1px_0_#9a3412] active:translate-y-0.5 active:shadow-none"
            >
              {claw.label}
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto grid max-w-3xl grid-cols-3 gap-3 px-4 pt-1 pb-6 lg:grid-cols-6">
        {PLUSHIES.map((p) => {
          const n = collection[p.id] ?? 0
          return (
            <button
              key={p.id}
              onClick={
                n
                  ? undefined
                  : () => showTip({ icon: '🧸', title: '还没抓到这只', text: `${RARITY_LABEL[p.rarity]}娃娃，去电玩城的小鸡抓抓乐碰碰运气吧！`, action: { label: claw.label, onClick: claw.go } })
              }
              className={`rounded-2xl bg-white p-2 text-center shadow-[0_8px_20px_-12px_rgba(236,72,153,0.35)] ${n ? 'cursor-default' : 'active:scale-95'}`}
            >
              <img src={plushUrl(p.id)} alt="" loading="lazy" decoding="async" className={`mx-auto aspect-square w-full object-contain ${n ? '' : 'opacity-25 grayscale'}`} />
              <div className={`truncate text-xs ${n ? 'font-semibold' : 'text-[#c2a59c]'}`}>{n ? p.name : '？？？'}</div>
              <div className="text-[10px] text-[#c2a59c]">
                {RARITY_LABEL[p.rarity]}
                {n > 1 ? ` · ×${n}` : ''}
              </div>
            </button>
          )
        })}
      </div>
    </Page>
  )
}

/**
 * 记录：对话原文（AI 的完整输出，含分区标签）。聊天式排版：电子姬在左（头像＝logo），玩家在右（头像＝名字首字，署名＝初始设定里的名字），AI 是白卡片。
 * 打开时停在最新一条；往上滚到顶自动加载更早的（每次 20 条），加载完停在原来读的位置，不跳。
 */
export function LogPage({ items, me, avatar, hasMore, onMore, onBack }: {
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

/** CG 全屏查看：点任意处关闭 */
export function CgViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [broken, setBroken] = useState(!src) // 没地址 / 加载失败：给句话，别是一片黑
  return (
    <button onClick={onClose} className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black">
      {broken ? (
        <span className="px-8 text-center text-sm leading-6 text-white/70">这张回忆的图片没加载出来<br />检查一下网络，稍后在「图册」里再看看</span>
      ) : (
        <img src={src} alt="" decoding="async" onError={() => setBroken(true)} className="max-h-full max-w-full object-contain" />
      )}
      <span className="absolute inset-x-0 bottom-0 pb-safe text-center text-xs text-white/50">
        <span className="inline-block py-3">点击继续</span>
      </span>
    </button>
  )
}
