import { PLUSHIES, plushUrl, RARITY_LABEL, type PlushId } from '../../claw/data'
import { showTip } from '../tipStore'
import { CG_NAMES } from '../content'
import Page from './Page'

/** 图册：白相框 + 名字；没解锁的是小鸡剪影 + 编号（不加载图） */
export default function GalleryPage({ unlocked, url, onOpen, collection, claw, onBack }: {
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
