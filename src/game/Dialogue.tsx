import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Icon } from '../components/icons'
import InputSheet from '../components/InputSheet'
import SendButton from '../components/SendButton'
import Choices from './Choices'
import { CHAR_NAME, LOGO_URL } from './content'
import ErrorNotice, { type NoticeError } from './ErrorNotice'
import { useTurnCursor, useTurnProgress } from '@dianziji/stage/react'
import { useDialogue } from './useGame'
import { usePref } from './usePref'
import ReviewBar from './ReviewBar'
import Thinking from './Thinking'
import Typewriter from './Typewriter'

type Mode = 'normal' | 'expanded' | 'hidden'
const MODES = ['normal', 'expanded', 'hidden'] as const

/** 正文区最高多高：标准 / 展开（矮屏——手机横屏——上限再压低） */
const BODY_H: Record<Exclude<Mode, 'hidden'>, string> = {
  normal: 'max-h-[32dvh] lg:max-h-[26dvh] [@media(max-height:520px)]:max-h-[24dvh]',
  expanded: 'max-h-[62dvh] lg:max-h-[56dvh] [@media(max-height:520px)]:max-h-[52dvh]',
}

/**
 * 底部对话框：名牌 + 正文（生成中跟着流一个字一个字长出来）+ 选项 + 「自己说」。
 *  三种状态（记在本机）：标准 / 展开（读长正文）/ 隐藏（只留左下角小胶囊，看立绘场景）。
 *  操作：顶部把手往上拖＝展开、往下拖＝收起 / 隐藏、轻点＝标准⇄展开；右上角两颗按钮（电脑用）。
 *  新一轮开始时若是隐藏的，自动恢复成标准（别错过回复）。
 * ★性能：高度直接换档，不做高度动画（那个每帧都要排版）；拖动只在松手时判断方向。
 *  电脑：「自己说」是对话框里的一行输入框；手机：点了打开全屏输入（InputSheet）。
 */
export default function Dialogue({ said, me, busy, error, topupUrl, onSend, onDismissError }: {
  said: string
  /** 玩家名字（等回复时那句话的署名） */
  me: string
  busy: boolean
  error: NoticeError | null
  /** 能量不足时「去充值」打开的地址 */
  topupUrl: string
  onSend: (text: string) => Promise<boolean>
  onDismissError: () => void
}) {
  // ★正文 / 选项 / 正在写哪个区由对话框自己按区订阅：AI 写字时只有对话框更新，App 不重画
  const { body, choices } = useDialogue()
  // 上一轮 / 下一轮：回看时正文、立绘、场景、心声都是那一轮的（SDK 换了分区），这里只管翻页按钮 + 选项置灰
  const cursor = useTurnCursor()
  const [text, setText] = useState('')
  const [sheet, setSheet] = useState(false)
  const [mode, setMode] = usePref<Mode>('gal-dialog', 'normal', MODES)
  const scroller = useRef<HTMLDivElement>(null)
  const dragY = useRef<number | null>(null)

  // 新一轮开始那一下：隐藏着就恢复（别错过她说话）。只看「开始」这一下——生成中玩家自己再隐藏，不再弹回来
  const modeRef = useRef(mode)
  useEffect(() => {
    modeRef.current = mode
  })
  useEffect(() => {
    if (busy && modeRef.current === 'hidden') setMode('normal')
  }, [busy, setMode])

  /** 发一句：自己打的、选项、「再说一次」都走这里。发出去的正好是草稿才清草稿（点选项不吃掉打了一半的话） */
  // ★send 要等 AI 整条回复写完才兑现：一点发送就先关输入层、清草稿（会话那边已经进入「生成中」），发失败再把话还回来
  const say = async (t: string) => {
    const line = t.trim()
    if (!line || busy) return
    const wasDraft = line === text.trim()
    if (wasDraft) setText('')
    setSheet(false)
    if (!(await onSend(line)) && wasDraft) setText(line)
  }

  // 把手：松手时看拖了多少（往上展开、往下收起；已经最小再往下＝隐藏；几乎没动＝轻点切换）
  const onHandleDown = (e: PointerEvent<HTMLButtonElement>) => {
    dragY.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onHandleUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragY.current === null) return
    const dy = e.clientY - dragY.current
    dragY.current = null
    if (Math.abs(dy) < 8) setMode(mode === 'expanded' ? 'normal' : 'expanded')
    else if (dy < 0) setMode('expanded')
    else setMode(mode === 'expanded' ? 'normal' : 'hidden')
  }

  if (mode === 'hidden') {
    return (
      <div className="absolute bottom-0 left-0 z-20 px-safe pb-composer">
        <div className="px-3">
          {error && <ErrorNotice error={error} topupUrl={topupUrl} onRetry={(t) => void say(t)} onClose={onDismissError} />}
          <button onClick={() => setMode('normal')} className="glass-strong flex animate-fade-in items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold">
            <NamePlate />
            点我继续
            <Icon name="up" className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    // ★整列有高度上限：永远停在顶栏 + 抓娃娃入口下面（空间不够时是正文自己滚，不是整列往上顶、压住顶栏）
    <div className="absolute inset-x-0 bottom-0 z-20 flex max-h-[calc(100dvh-var(--safe-top)-148px)] flex-col justify-end px-safe pb-composer [@media(max-height:520px)]:max-h-[calc(100dvh-var(--safe-top)-64px)]">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-col px-3 lg:max-w-4xl">
        {/* 选项（可收起；对话框展开＝阅读模式，选项自动收成胶囊） */}
        {cursor.viewing && <ReviewBar back={cursor.back} said={cursor.said} me={me} onLatest={cursor.latest} />}
        <Choices choices={choices} busy={busy || cursor.viewing} forceClosed={mode === 'expanded'} onExpand={() => setMode('normal')} onPick={(c) => void say(c)} />

        {error && <ErrorNotice error={error} topupUrl={topupUrl} onRetry={(t) => void say(t)} onClose={onDismissError} />}

        <div className="glass-strong relative flex min-h-0 flex-col rounded-3xl">
          <NamePlate className="absolute -top-3.5 left-4 z-10" />
          {/* 标题栏（在框内）：左边给名牌让位、中间把手（上下拖 / 轻点）、右边分段小胶囊（展开收起 | 隐藏） */}
          <div className="relative flex h-10 shrink-0 items-center justify-end pr-3">
            {/* 把手：相对整个对话框绝对居中（不受左边名牌、右边按钮宽度影响） */}
            <button
              onPointerDown={onHandleDown}
              onPointerUp={onHandleUp}
              onPointerCancel={() => (dragY.current = null)}
              aria-label={mode === 'expanded' ? '收起对话框' : '展开对话框'}
              className="absolute inset-y-0 left-1/2 flex w-24 -translate-x-1/2 touch-none items-center justify-center"
            >
              <span className="h-1 w-10 rounded-full bg-white/35" />
            </button>
            {/* 上一轮 / 下一轮（生成中不能翻；到最新那一轮 › 置灰） */}
            <div className="mr-1.5 flex items-center rounded-full bg-white/10 text-white/70">
              <button onClick={() => void cursor.prev()} disabled={!cursor.canPrev} aria-label="上一轮" title="上一轮" className="grid h-7 w-8 place-items-center rounded-l-full hover:text-white disabled:opacity-30">
                <Icon name="back" className="size-4" />
              </button>
              <span className="h-3.5 w-px bg-white/20" />
              <button onClick={cursor.next} disabled={!cursor.canNext} aria-label="下一轮" title="下一轮" className="grid h-7 w-8 place-items-center rounded-r-full hover:text-white disabled:opacity-30">
                <Icon name="back" className="size-4 rotate-180" />
              </button>
            </div>
            <div className="flex items-center rounded-full bg-white/10 text-white/70">
              <button
                onClick={() => setMode(mode === 'expanded' ? 'normal' : 'expanded')}
                aria-label={mode === 'expanded' ? '收起对话框' : '展开对话框'}
                className="grid h-7 w-8 place-items-center rounded-l-full hover:text-white"
              >
                <Icon name={mode === 'expanded' ? 'down' : 'up'} className="size-4" />
              </button>
              <span className="h-3.5 w-px bg-white/20" />
              <button onClick={() => setMode('hidden')} aria-label="隐藏对话框" className="grid h-7 w-8 place-items-center rounded-r-full hover:text-white">
                <Icon name="hide" className="size-4" />
              </button>
            </div>
          </div>
          <div
            ref={scroller}
            className={`${BODY_H[mode]} min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 pb-3 text-[15px] leading-7 break-words whitespace-pre-wrap [@media(max-height:520px)]:leading-6`}
          >
            {/* key：换到另一轮就重新挂载＝直接显示全文（回看不重新打一遍字） */}
            {body ? <Typewriter key={cursor.id ?? 'latest'} text={body} streaming={busy} markdown scrollEl={scroller} /> : busy ? <Thinking said={said} name={CHAR_NAME} me={me} /> : ''}
          </div>

          {/* 自己说（生成中这一栏变成「正在写 · 哪个区」+ 进度：反正这时也不能输入） */}
          <div className="border-t border-white/15 p-2">
            {busy ? (
              <WritingBar />
            ) : (
              <>
                <button onClick={() => setSheet(true)} className="w-full truncate rounded-full bg-white/10 px-4 py-2.5 text-left text-sm text-white/70 lg:hidden">
                  {text || '自己说点什么…'}
                </button>
                <div className="hidden items-center gap-2 lg:flex">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) void say(text)
                    }}
                    placeholder="自己说点什么…（Enter 发送）"
                    className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-white/50"
                  />
                  <SendButton onClick={() => void say(text)} disabled={!text.trim()} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {sheet && <InputSheet value={text} onChange={setText} onSend={() => void say(text)} onClose={() => setSheet(false)} disabled={busy} />}
    </div>
  )
}

/** 名牌：小巧的标牌——头像收在里面 + 名字 + 金色小星芒（细白边、顶部一道高光、淡投影） */
function NamePlate({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border border-white/55 bg-gradient-to-r from-pink-500 to-rose-500 py-[3px] pr-3 pl-[3px] shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_2px_8px_-2px_rgb(0_0_0/0.45)] ${className}`}
    >
      <img src={LOGO_URL} alt="" width={22} height={22} className="size-[22px] rounded-full ring-1 ring-white/80" />
      <span className="text-[13px] leading-none font-semibold tracking-wider text-white">{CHAR_NAME}</span>
      <span className="text-[9px] leading-none text-amber-200">✦</span>
    </div>
  )
}

/**
 * 生成中的输入栏：「● 正在写 · 心声」（区名用卡里分区的名字）+ 底边一条细进度条。
 * 进度只看 AI 写到哪个区了（SDK useTurnProgress）；AI 写完就变回输入框。和输入框同高，切换时不跳。
 */
function WritingBar() {
  const p = useTurnProgress()
  const text = p?.zone ? `正在写 · ${p.label}` : `${CHAR_NAME}在想…`
  return (
    <div role="status" aria-live="polite" className="relative flex h-10 items-center gap-2 overflow-hidden rounded-full bg-white/10 px-4 text-sm text-white/80">
      <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-pink-300" />
      <span className="truncate">{text}</span>
      <span className="absolute inset-x-4 bottom-1 h-0.5 overflow-hidden rounded-full bg-white/15">
        <span className="block h-full origin-left rounded-full bg-gradient-to-r from-pink-300 to-rose-400 transition-transform duration-500" style={{ transform: `scaleX(${Math.max(0.04, p?.ratio ?? 0)})` }} />
      </span>
    </div>
  )
}

