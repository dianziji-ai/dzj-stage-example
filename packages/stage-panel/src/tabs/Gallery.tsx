import { useEffect, useState } from 'react'
import { StageError, type StageClient, type StageGallery, type StageGalleryImage } from '@dianziji/stage/client'
import { Empty } from '../parts'
import { btnSoft, muted } from '../ui'

/** 相册内一页多少张：手机 3 列 × 8 行。只渲染这一页，图再多 DOM 和解码内存也不涨 */
const PAGE = 24

type Album = StageGallery['packs'][number]

/**
 * 图册：和网站画廊同一套规则（轮数＝这张卡所有会话累计的 AI 回复数，相册按 rounds 解锁）。
 * ★性能：打开这一页才请求（GET /stage/gallery）；书架只出封面（480 缩略图），点开某一本才渲染那一本的图，
 *   每页 24 张、缩略图（400，只取第一帧）、懒加载；点开大图才拉原图。
 */
export default function Gallery({ stage }: { stage: StageClient }) {
  const [data, setData] = useState<StageGallery | null>(null)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<Album | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    stage
      .gallery()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(e instanceof StageError ? e.message : '图册读取失败'))
    return () => {
      alive = false
    }
  }, [stage, attempt])

  if (err)
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sp-danger">{err}</p>
        <button
          className={btnSoft}
          onClick={() => {
            setErr('')
            setAttempt((n) => n + 1)
          }}
        >
          再试一次
        </button>
      </div>
    )
  if (!data) return <Empty>读取中…</Empty>

  // 门面图也是一本相册，永远排第一（同网站画廊）
  const books: Album[] = [
    ...(data.previews.length ? [{ name: '预览', state: 'open' as const, rounds: 0, count: data.previews.length, cover: data.previews[0].thumb, images: data.previews }] : []),
    ...data.packs,
  ]
  if (open) return <AlbumView album={open} onBack={() => setOpen(null)} />
  if (!books.length) return <Empty>这张卡还没有图</Empty>

  return (
    <>
      <p className={muted}>已玩 {data.turns} 轮（这张卡所有会话累计）· 玩到对应轮数解锁相册</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {books.map((b) => (
          <Book key={b.name} album={b} turns={data.turns} onOpen={() => setOpen(b)} />
        ))}
      </div>
    </>
  )
}

/** 书架上的一本：解锁的是封面；锁着的是蒙布 + 还差几轮 + 进度条；没开放的只写「未公开」 */
function Book({ album, turns, onOpen }: { album: Album; turns: number; onOpen: () => void }) {
  const ok = album.state === 'open'
  const need = Math.max(0, album.rounds - turns)
  return (
    <button onClick={ok ? onOpen : undefined} disabled={!ok} className="min-w-0 overflow-hidden rounded-xl border border-sp-line bg-sp-card text-left disabled:cursor-default">
      <div className="relative aspect-[4/3] bg-sp-code">
        {ok && album.cover ? (
          <img src={album.cover} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[repeating-linear-gradient(45deg,transparent_0_8px,rgb(0_0_0/0.03)_8px_16px)] px-3 text-center">
            <span className="text-lg">🔒</span>
            <span className={`text-[11px] ${muted}`}>{album.state === 'locked' ? `再玩 ${need} 轮` : '作者未公开'}</span>
            {album.state === 'locked' && album.rounds > 0 && (
              <span className="h-1 w-3/4 overflow-hidden rounded-full bg-sp-line">
                <span className="block h-full origin-left bg-sp-accent" style={{ transform: `scaleX(${Math.min(1, turns / album.rounds)})` }} />
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 px-2.5 py-2">
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{album.name}</span>
        <span className={`shrink-0 text-[11px] ${muted}`}>{album.count} 张</span>
      </div>
    </button>
  )
}

/** 相册内页：分页网格 + 点开看原图 */
function AlbumView({ album, onBack }: { album: Album; onBack: () => void }) {
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState<StageGalleryImage | null>(null)
  const pages = Math.max(1, Math.ceil(album.images.length / PAGE))
  const shown = album.images.slice((page - 1) * PAGE, page * PAGE)

  return (
    <>
      <div className="flex items-center gap-2">
        <button className={btnSoft} onClick={onBack}>
          ← 图册
        </button>
        <b className="min-w-0 flex-1 truncate">{album.name}</b>
        <span className={`text-[11px] ${muted}`}>{album.images.length} 张</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {shown.map((im) => (
          <button key={im.src} onClick={() => setZoom(im)} className="aspect-square overflow-hidden rounded-lg bg-sp-code">
            <img src={im.thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          </button>
        ))}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className={btnSoft} disabled={page <= 1} onClick={() => setPage(page - 1)}>
            上一页
          </button>
          <span className={`text-xs tabular-nums ${muted}`}>
            {page} / {pages}
          </span>
          <button className={btnSoft} disabled={page >= pages} onClick={() => setPage(page + 1)}>
            下一页
          </button>
        </div>
      )}
      {/* 原图：盖住整个面板，点任意处关闭 */}
      {zoom && (
        <button onClick={() => setZoom(null)} aria-label="关闭大图" className="fixed inset-0 z-[95] flex animate-sp-fade items-center justify-center bg-black/90 p-3">
          <img src={zoom.src} alt="" decoding="async" className="max-h-full max-w-full object-contain" />
        </button>
      )}
    </>
  )
}
