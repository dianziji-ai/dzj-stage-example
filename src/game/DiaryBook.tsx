import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../components/icons'
import { CHAR_NAME } from './content'
import { fileName, paragraphs, type DiaryPage } from './diary'
import { weatherIcon } from './logic'
import s from './DiaryBook.module.css'

/** 玩家要不要动画：系统「减少动态效果」或播放设置里的「动效：减少」都算 */
const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.getAttribute('data-dzj-motion') === 'reduced'

/**
 * 她的日志（照《妈妈柳月儿》的日记本搬过来，样子改成「她偷偷存在电脑里的记事本」）：
 *  · 一个记事本窗口：标题栏 log_day01.txt，左边行号，第一行是注释（第几天 · 天气 · 心情），下面是正文。
 *  · 电脑：左边一列文件（每天一个 .txt），点哪个看哪个；手机：一次一页，左右滑 / 底下箭头翻。
 *  · 「删掉的一行」：翻到这一页时她在末尾打出一行字、停一下、又一个字一个字退格删掉；按「Ctrl+Z」能把它找回来（划掉的灰字）。
 *  · 翻到最前面还有更早的历史：读更早的记录（loadOlder），页数变多后停在原来那一页。
 * 挂在 body 上；Esc / ✕ / 点窗口外面关。
 */
export default function DiaryBook({ pages, hasOlder, loadOlder, onClose }: { pages: DiaryPage[]; hasOlder: boolean; loadOlder: () => Promise<boolean>; onClose: () => void }) {
  const [curId, setCurId] = useState<number | null>(() => pages.at(-1)?.id ?? null)
  const [loading, setLoading] = useState(false)
  // 当前页按 id 认：往前读到更早的页、或者生成出新的一页，都停在原来那页
  const found = pages.findIndex((p) => p.id === curId)
  const cur = found >= 0 ? found : pages.length - 1
  const last = pages.length - 1
  const page = pages[cur]

  const go = useCallback((to: number) => to >= 0 && to <= last && setCurId(pages[to].id), [last, pages])
  const older = useCallback(async () => {
    if (loading || !hasOlder) return
    setLoading(true)
    try {
      await loadOlder()
    } finally {
      setLoading(false)
    }
  }, [loading, hasOlder, loadOlder])
  const prev = useCallback(() => (cur > 0 ? go(cur - 1) : void older()), [cur, go, older])
  const next = useCallback(() => go(cur + 1), [cur, go])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [prev, next, onClose])

  // 滑动翻页（手机主要靠它）：横向超过 50px、且比竖向滑得多才算
  const down = useRef<{ x: number; y: number } | null>(null)
  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current
    down.current = null
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    if (dx < 0) next()
    else prev()
  }

  const canPrev = cur > 0 || hasOlder
  const canNext = cur < last

  return createPortal(
    <div className={`${s.root} fixed inset-0 z-[75] flex animate-fade-in flex-col items-center px-safe pt-safe pb-safe`} onClick={onClose} onContextMenu={(e) => e.stopPropagation()} data-no-advance>
      <div className="flex min-h-0 w-full max-w-[980px] flex-1 flex-col px-3 py-3 lg:px-6 lg:py-8">
        <div className={`${s.win} ${s.mono} flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl`} onClick={(e) => e.stopPropagation()}>
          {/* 标题栏：三颗圆点 · 文件名 · 关 */}
          <div className={`${s.bar} flex h-11 shrink-0 items-center gap-2 px-3.5`}>
            <span className={`${s.dot} bg-[#ff5f57]`} />
            <span className={`${s.dot} bg-[#febc2e]`} />
            <span className={`${s.dot} bg-[#28c840]`} />
            <span className="ml-2 min-w-0 flex-1 truncate text-[12.5px] text-[#cfc3ea]">
              {page ? fileName(page) : 'log.txt'} <span className="text-[#8f82ad]">— {CHAR_NAME}的电脑 · {'C:\\秘密\\'}</span>
            </span>
            <button onClick={onClose} data-sfx="cancel" aria-label="关掉日志" className="grid size-8 shrink-0 place-items-center rounded-full text-[#cfc3ea] hover:bg-white/10">
              <Icon name="close" className="size-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1">
            {/* 电脑：左边文件列表 */}
            <ul className="hidden w-52 shrink-0 overflow-y-auto border-r border-white/6 py-2 lg:block">
              {hasOlder && (
                <li>
                  <button onClick={() => void older()} disabled={loading} className="w-full px-4 py-1.5 text-left text-[12px] text-[#8f82ad] hover:text-white disabled:opacity-60">
                    {loading ? '读取中…' : '↑ 更早的记录'}
                  </button>
                </li>
              )}
              {pages.map((p, i) => (
                <li key={p.id}>
                  <button onClick={() => go(i)} data-on={i === cur ? '' : undefined} className={`${s.file} flex w-full items-center gap-2 px-4 py-1.5 text-left text-[12.5px] hover:text-white`}>
                    <span aria-hidden>📄</span>
                    <span className="min-w-0 flex-1 truncate">{fileName(p)}</span>
                    {i === last && <span className="rounded bg-[#ff7eb6] px-1 text-[9px] font-bold text-white">NEW</span>}
                  </button>
                </li>
              ))}
            </ul>

            {/* 正文 */}
            <div
              className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-3 py-4 text-[calc(13.5px*var(--dzj-font-scale,1))] lg:px-6 lg:py-6 lg:text-[calc(15px*var(--dzj-font-scale,1))]"
              onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
              onPointerUp={onPointerUp}
              onPointerCancel={() => (down.current = null)}
            >
              {page ? <Page key={page.id} p={page} /> : <Empty />}
            </div>
          </div>

          {/* 底栏：翻页（手机主要靠它）+ 第几页 */}
          <div className="flex h-12 shrink-0 items-center gap-2 border-t border-white/6 px-3 text-[12px] text-[#8f82ad]">
            <button onClick={prev} disabled={!canPrev || loading} aria-label={cur > 0 ? '上一页' : '读更早的记录'} className="grid size-9 place-items-center rounded-full hover:bg-white/10 hover:text-white disabled:opacity-25">
              <Icon name="back" className="size-4" />
            </button>
            <span className="min-w-0 flex-1 truncate text-center tabular-nums">
              {loading ? '读取中…' : pages.length ? `${cur + 1} / ${pages.length}${page?.day ? ` · 第 ${page.day} 天` : ''}` : '0 个文件'}
            </span>
            {cur < last - 1 && (
              <button onClick={() => go(last)} className="shrink-0 rounded-full px-2.5 py-1 text-[#ff7eb6] hover:bg-white/10">
                最新 ›
              </button>
            )}
            <button onClick={next} disabled={!canNext} aria-label="下一页" className="grid size-9 place-items-center rounded-full hover:bg-white/10 hover:text-white disabled:opacity-25">
              <Icon name="back" className="size-4 rotate-180" />
            </button>
          </div>
        </div>
        <p className="mt-2 hidden text-center text-[11px] tracking-wider text-white/30 lg:block">← → 翻页 · Esc 关掉 · 别让她知道你看过</p>
      </div>
    </div>,
    document.body,
  )
}

/** 一页：注释头 + 标题 + 正文段落 + 末尾删掉的那一行（每行一个行号） */
function Page({ p }: { p: DiaryPage }) {
  const icon = weatherIcon(p.weather)
  const rows: React.ReactNode[] = [
    <span key="head" className={s.comment}>
      # 第 {p.day || '?'} 天{p.weather && ` · ${icon ? `${icon} ` : ''}${p.weather}`}
      {p.mood && ` · 心情: ${p.mood}`}
    </span>,
    <Fragment key="title">
      <span className={s.key}>标题:</span> {p.title || '（没起标题）'}
    </Fragment>,
    null,
    ...paragraphs(p.body),
    null,
    p.deleted ? <Deleted key="del" text={p.deleted} /> : <span key="cur" className={s.cursor} aria-hidden />,
  ]
  return (
    <div className={s.page}>
      {rows.map((r, i) => (
        <div key={i} className={s.line}>
          <i>{i + 1}</i>
          <span className="min-w-0 break-words">{r}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * 删掉的那一行：停一下 → 一个字一个字打出来 → 停住 → 一个字一个字退格删光 → 光标在空行上闪。
 * 打字直接写 DOM（不让 React 每个字重画）；删光后出一颗「Ctrl+Z」小按钮，点了找回来（划掉的灰字）。减少动态效果：直接是找回来的样子。
 */
function Deleted({ text }: { text: string }) {
  const out = useRef<HTMLSpanElement>(null)
  const [phase, setPhase] = useState<'typing' | 'gone' | 'restored'>(() => (reducedMotion() ? 'restored' : 'typing'))
  useEffect(() => {
    if (phase !== 'typing') return
    const chars = [...text]
    const timers: number[] = []
    let t = 900
    const put = (k: number) => out.current && (out.current.textContent = chars.slice(0, k).join(''))
    chars.forEach((_, k) => timers.push(window.setTimeout(() => put(k + 1), (t += 85))))
    t += 1300
    chars.forEach((_, k) => timers.push(window.setTimeout(() => put(chars.length - k - 1), (t += 38))))
    timers.push(window.setTimeout(() => setPhase('gone'), t + 300))
    return () => timers.forEach((x) => window.clearTimeout(x))
  }, [phase, text])

  if (phase === 'restored')
    return (
      <span>
        <span className={s.restored}>{text}</span> <span className="text-[11px] text-[#8f82ad]">（她删掉的）</span>
      </span>
    )
  return (
    <span>
      <span ref={out} className={s.ghost} />
      <span className={s.cursor} aria-hidden />
      {phase === 'gone' && (
        <button onClick={() => setPhase('restored')} className="ml-3 animate-fade-in rounded border border-white/15 px-1.5 text-[11px] text-[#8f82ad] hover:border-[#ff7eb6] hover:text-[#ff7eb6]" title="把她删掉的那一行找回来">
          Ctrl+Z
        </button>
      )}
    </span>
  )
}

function Empty() {
  return (
    <div className={s.page}>
      <div className={s.line}>
        <i>1</i>
        <span className={s.comment}># log.txt 还是空的</span>
      </div>
      <div className={s.line}>
        <i>2</i>
        <span className="text-[#8f82ad]">等她过完一天、睡觉前，会偷偷写在这里。</span>
      </div>
      <div className={s.line}>
        <i>3</i>
        <span>
          <span className={s.cursor} aria-hidden />
        </span>
      </div>
    </div>
  )
}
