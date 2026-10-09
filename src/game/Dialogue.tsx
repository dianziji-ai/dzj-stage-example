import { useEffect, useRef, useState, type RefObject } from 'react'
import { useTurnCursor, useTurnProgress } from '@dianziji/stage/react'
import { useAutoPlay, useTypewriter } from '@dianziji/stage-settings'
import { Icon } from '../components/icons'
import InputSheet from '../components/InputSheet'
import SendButton from '../components/SendButton'
import BeatText from './BeatText'
import { NO_LOOK, sameLook, toneOf, type Look } from './art'
import { lastLook, lookAt, type Beat } from './beats'
import Choices from './Choices'
import ChoiceConfirm from './ChoiceConfirm'
import { choiceConfirmed, rememberChoiceConfirmed } from './choicePref'
import { CHAR_NAME, LOGO_URL } from './content'
import ErrorNotice, { type NoticeError } from './ErrorNotice'
import ReviewBar from './ReviewBar'
import PlayControl from './PlayControl'
import ShortcutTray from './ShortcutTray'
import { useBeats, useChoices, useShortcuts } from './useGame'
import { usePref } from './usePref'
import d from './Dialogue.module.css'

/**
 * 底部对话区（galgame 式）：一轮拆成一句一句播——旁白 → 你说的 → 她说的（每句自带表情）。
 *  · 点正文 / 「▶」看下一句；「◀ ▶」翻句、「‹ ›」翻轮（回看上一轮，SDK 的 useTurnCursor）。
 *  · 每换一句，把她这句的样子交给 App（onFocus，只在变了的时候交）：立绘一句一换。读到最后一句告诉 App（onEnd）：心声这时才冒。
 *  · 新一轮从第一句开始；生成中边写边读，读到最新那句它会继续长。
 *  · 手机：底下不常驻输入栏，标题栏右边一颗气泡点开全屏输入（InputSheet）；她在写时底下浮一条细进度。
 *    电脑：底下一行输入框。
 *  · ⚡ 快捷指令：卡上配了才出（ShortcutTray）；填进输入框或直接发，看作者设的 mode。
 *  · 可以整个隐藏（只留左下角小胶囊，看立绘和场景），记在本机；新一轮开始时自动恢复。
 * ★性能：对话框自己按区订阅旁白 / 对话 / 选项（useBeats / useChoices），AI 写字时只有它重画，App 不动。
 */
export default function Dialogue({ me, call, busy, error, topupUrl, onSend, onDismissError, onFocus, onEnd, active = true, advanceRef }: {
  /** 玩家名字（名牌上写；没填写「你」） */
  me: string
  /** 她对你的称呼（换场选项里「主人的房间」用） */
  call: string
  busy: boolean
  error: NoticeError | null
  /** 能量不足时「去充值」打开的地址 */
  topupUrl: string
  onSend: (text: string) => Promise<boolean>
  onDismissError: () => void
  /** 这一句她是什么样子（App 拿去配图库挑立绘） */
  onFocus: (look: Look) => void
  /** 读没读到最后一句（写完了、选项出来了）：心声这时才冒，当这一轮的收尾 */
  onEnd: (end: boolean) => void
  /** 在游玩页吗（切到地图 / 图鉴 / 抓娃娃时对话框只是藏起来、不卸载：自动播放要停） */
  active?: boolean
  /** 把「下一句」交给外层：左键点画面空白处也翻页（gestures.ts） */
  advanceRef?: RefObject<() => void>
}) {
  const beats = useBeats()
  const choices = useChoices()
  const cursor = useTurnCursor()
  const [text, setText] = useState('')
  const [sheet, setSheet] = useState(false)
  const shortcuts = useShortcuts()
  const [tray, setTray] = useState(false)
  const [mode, setMode] = usePref('gal-dialog', 'shown', ['shown', 'hidden'] as const)

  // 新一轮开始那一下：隐藏着就恢复（别错过她说话）
  const wasBusy = useRef(busy)
  useEffect(() => {
    if (busy && !wasBusy.current && mode === 'hidden') setMode('shown')
    wasBusy.current = busy
  }, [busy, mode, setMode])

  // 读到第几句：换了一轮（新生成 / 回看）就回到第一句（React「根据上一次渲染调整状态」写法，不用 effect）
  const turn = busy ? 'live' : `t${cursor.id ?? 'latest'}`
  const [pos, setPos] = useState({ turn, idx: 0, text: '' })
  // 换了一轮才回到第一句；★生成中玩家已经点着往下读了，写完（live → 最新一轮）就从读到的那句接着播，不跳回开头
  //   按句子内容找回来（写完后句子顺序可能变：生成中先把你说的那句补在最前，写完它挪到旁白后面）；找不到再按位置。生成中那句可能只写了半截，所以也认「开头一样」
  if (pos.turn !== turn) {
    const keep = pos.turn === 'live' && turn === 'tlatest'
    const at = keep && pos.text ? beats.findIndex((b) => b.text === pos.text || b.text.startsWith(pos.text)) : -1
    setPos({ turn, idx: keep ? (at >= 0 ? at : pos.idx) : 0, text: keep ? pos.text : '' })
  }
  const last = Math.max(0, beats.length - 1)
  const idx = Math.min(pos.idx, last)
  const beat: Beat | undefined = beats[idx]
  const go = (i: number) => setPos({ turn, idx: Math.max(0, Math.min(last, i)), text: beats[Math.max(0, Math.min(last, i))]?.text ?? '' })

  // 播放设置（独立模块 @dianziji/stage-settings）：
  //   逐字打出（文本速度）；打字中点一下先补完这句，再点才翻页；
  //   自动播放：字打完才开始计时，到点翻下一句；最后一句 / 还没写出下一句时原地等；开着输入框、快捷指令、回看、对话框藏起来、切到别的页面时暂停
  const tw = useTypewriter(beat?.text ?? '')
  const next = () => (tw.done ? go(idx + 1) : tw.finish())
  useEffect(() => {
    if (advanceRef) advanceRef.current = next
  })
  const auto = useAutoPlay({ text: beat?.text ?? '', canAdvance: idx < last, onNext: () => go(idx + 1), ready: tw.done, paused: !active || sheet || tray || cursor.viewing || mode === 'hidden' || !!error })
  const [askChoice, setAskChoice] = useState<string | null>(null) // 点了选项、等确认的那一句

  // 立绘：这一句她的样子；这一轮她还没开口（刚发出去 / 一轮开头全是旁白且她没说话）就停在上一轮最后的样子
  const [held, setHeld] = useState<Look>(NO_LOOK)
  const end = lastLook(beats)
  if (!busy && end && !sameLook(end, held)) setHeld(end)
  const found = lookAt(beats, idx, held)
  // 每次解析出来的对象都是新的：内容没变就还用上一次那个，免得 App 每次都重挑
  const [look, setLook] = useState<Look>(found)
  if (!sameLook(found, look)) setLook(found)
  useEffect(() => onFocus(look), [look, onFocus])
  const atEnd = !busy && beats.length > 0 && idx === last
  useEffect(() => onEnd(atEnd), [atEnd, onEnd])

  // 名牌和颜色：她＝按这句的表情；你＝雾蓝；屏幕消息＝金；旁白没有名牌
  const tone = beat?.kind === 'her' ? toneOf(beat.look.expr) : beat?.kind === 'you' ? 'you' : beat?.kind === 'note' ? 'note' : undefined

  /** 发一句：自己打的、选项、「再说一次」都走这里。发出去的正好是草稿才清草稿（点选项不吃掉打了一半的话），发失败再还回来 */
  const say = async (t: string) => {
    const line = t.trim()
    if (!line || busy) return
    const wasDraft = line === text.trim()
    if (wasDraft) setText('')
    setSheet(false)
    if (!(await onSend(line)) && wasDraft) setText(line)
  }

  /** 去自己说（没有选项时点那条提示）：电脑落到下面常驻的输入框，手机打开全屏输入层 */
  const inputRef = useRef<HTMLInputElement>(null)
  const talk = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) inputRef.current?.focus()
    else setSheet(true)
  }

  /** 点选项：直接发出去，不填输入框。第一次点先确认一次（勾了「以后不再提示」就记在本机，之后直接发） */
  const pick = (c: string) => {
    if (busy) return
    if (!choiceConfirmed()) return void setAskChoice(c)
    void say(c)
  }

  if (mode === 'hidden') {
    return (
      <div className="absolute bottom-0 left-0 z-20 px-safe pb-composer">
        <div className="px-3">
          {error && <ErrorNotice error={error} topupUrl={topupUrl} onRetry={(t) => void say(t)} onClose={onDismissError} />}
          <button onClick={() => setMode('shown')} className={`${d.box} flex animate-fade-in items-center gap-1.5 rounded-full py-1 pr-3.5 pl-1 text-sm font-bold`} data-tone={toneOf(look.expr)}>
            <span className={`${d.plate} flex items-center gap-1.5 rounded-full py-[3px] pr-3 pl-[3px]`}>
              <img src={LOGO_URL} alt="" className="size-[22px] rounded-full ring-1 ring-white/80" />
              {CHAR_NAME}
            </span>
            <Icon name="up" className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex max-h-[calc(100dvh-var(--safe-top)-148px)] flex-col justify-end px-safe pb-composer">
      <div className={d.veil} aria-hidden />
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-col px-4 lg:max-w-3xl lg:px-6">
        {cursor.viewing && <ReviewBar back={cursor.back} said={cursor.said} me={me} onLatest={cursor.latest} />}
        {/* 选项只在读到最后一句时出：话还没听完，不急着做选择 */}
        {idx === last && <Choices choices={choices} call={call} busy={busy || cursor.viewing} onPick={pick} onTalk={talk} />}
        {error && <ErrorNotice error={error} topupUrl={topupUrl} onRetry={(t) => void say(t)} onClose={onDismissError} />}

        <div className={`flex min-h-0 flex-col pt-3 ${d.box}`} data-tone={tone}>
          {/* 标题栏：名牌 · 上一轮 / 下一轮 · 隐藏 ·（手机）说话气泡 */}
          <div className="mb-2 flex h-8 shrink-0 items-center gap-1">
            <Plate beat={beat} me={me} busy={busy} />
            <span className="flex-1" />
            <button onClick={() => void cursor.prev()} disabled={!cursor.canPrev} aria-label="上一轮" title="上一轮" className="grid h-8 min-w-8 place-items-center rounded-full text-white/55 transition-colors hover:text-white disabled:opacity-25">
              <Icon name="back" className="size-4" />
            </button>
            <button onClick={cursor.next} disabled={!cursor.canNext} aria-label="下一轮" title="下一轮" className="grid h-8 min-w-8 place-items-center rounded-full text-white/55 transition-colors hover:text-white disabled:opacity-25">
              <Icon name="back" className="size-4 rotate-180" />
            </button>
            <PlayControl state={auto} />
            <button onClick={() => setMode('hidden')} aria-label="隐藏对话框" title="隐藏对话框" className="grid size-8 place-items-center rounded-full text-white/55 transition-colors hover:text-white">
              <Icon name="hide" className="size-4" />
            </button>
            {shortcuts.length > 0 && (
              <button
                onClick={() => setTray(true)}
                disabled={busy || cursor.viewing}
                aria-label="快捷指令"
                title="快捷指令"
                className={`${d.plate} ml-0.5 grid size-8 place-items-center rounded-full text-white transition-transform active:scale-90 disabled:opacity-40 lg:hidden`}
              >
                <Icon name="bolt" className="size-4" />
              </button>
            )}
            <button
              onClick={() => setSheet(true)}
              disabled={busy || cursor.viewing}
              aria-label="自己说点什么"
              title="自己说点什么"
              className={`${d.plate} relative ml-0.5 grid size-8 place-items-center rounded-full text-white transition-transform active:scale-90 disabled:opacity-40 lg:hidden`}
            >
              {busy ? <span className="size-1.5 animate-pulse rounded-full bg-white" /> : <Icon name="chat" className="size-[18px]" />}
              {text && !busy && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#2a1238] bg-[#ffd23f]" />}
            </button>
          </div>

          {/* 这一句：点一下看下一句 */}
          <div className="relative flex min-h-0 flex-col">
            <button
              onClick={next}
              className="flex max-h-[26dvh] min-h-[76px] flex-col items-start justify-start overflow-y-auto pt-0.5 pr-6 pb-2 text-left text-[calc(15px*var(--dzj-font-scale,1))] leading-[1.85] break-words lg:max-h-[30dvh] lg:min-h-[92px] lg:text-[calc(17px*var(--dzj-font-scale,1))]"
            >
              {beat ? (
                <span key={`${turn}-${idx}`} className={`animate-fade-in ${beat.kind === 'narr' ? 'text-white/80' : beat.kind === 'you' ? 'text-[#cfe6ff]' : beat.kind === 'note' ? 'text-[#fff1c2]' : 'text-white/90'}`}>
                  <BeatText text={tw.shown} sayClass={d.say} />
                  {busy && idx === last && <span className="ml-0.5 inline-block w-2 animate-blink">▍</span>}
                </span>
              ) : (
                busy && <Thinking />
              )}
            </button>
            {!busy && idx < last && (
              <span className={`pointer-events-none absolute right-1 bottom-2.5 text-[11px] ${d.next}`} aria-hidden>
                ▼
              </span>
            )}
          </div>

          {/* 一句一句翻：◀ 一排细段（读过的亮）▶ · 3/12 */}
          {beats.length > 1 && (
            <div className="flex items-center gap-1.5 pb-2 text-[11px] text-white/55">
              <button onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="上一句" className="min-w-9 rounded-md px-1.5 py-1 hover:text-white disabled:opacity-25">
                ◀
              </button>
              <span className="flex min-w-0 flex-1 items-center justify-center gap-[3px]" aria-hidden>
                {beats.map((_, i) => (
                  <span key={i} className={d.seg} data-on={i <= idx ? '' : undefined} />
                ))}
              </span>
              <button onClick={() => go(idx + 1)} disabled={idx >= last} aria-label="下一句" className="min-w-9 rounded-md px-1.5 py-1 hover:text-white disabled:opacity-25">
                ▶
              </button>
              <span className="min-w-10 text-right tabular-nums">
                {idx + 1}
                <span className="text-white/35"> / {beats.length}</span>
              </span>
            </div>
          )}

          {/* 手机：她在写的时候底下浮一条细进度（平时没有输入栏） */}
          {busy && (
            <div className="pb-2 lg:hidden">
              <WritingBar compact />
            </div>
          )}

          {/* 电脑：一行输入框（生成中换成进度） */}
          <div className="hidden border-t border-white/12 py-2.5 lg:block">
            {busy ? (
              <WritingBar />
            ) : (
              <div className="flex items-center gap-2">
                {shortcuts.length > 0 && (
                  <button
                    onClick={() => setTray(true)}
                    disabled={cursor.viewing}
                    aria-label="快捷指令"
                    title="快捷指令"
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.07] text-white transition-colors hover:border-white/40 disabled:opacity-40"
                  >
                    <Icon name="bolt" className="size-4" />
                  </button>
                )}
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) void say(text)
                  }}
                  placeholder="自己说点什么…（Enter 发送）"
                  className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/45 focus:border-white/40"
                />
                <SendButton onClick={() => void say(text)} disabled={!text.trim()} />
              </div>
            )}
          </div>
        </div>
      </div>

      {tray && (
        <ShortcutTray
          items={shortcuts}
          onClose={() => setTray(false)}
          onPick={(s) => {
            setTray(false)
            if (s.mode === 'send') return void say(s.command)
            setText(s.command)
            if (window.matchMedia('(max-width: 1023px)').matches) setSheet(true) // 手机没有常驻输入栏：填好直接打开全屏输入
          }}
        />
      )}
      {askChoice !== null && (
        <ChoiceConfirm
          text={askChoice}
          onCancel={() => setAskChoice(null)}
          onSend={(remember) => {
            if (remember) rememberChoiceConfirmed()
            const c = askChoice
            setAskChoice(null)
            void say(c)
          }}
        />
      )}
      {sheet && <InputSheet value={text} onChange={setText} onSend={() => void say(text)} onClose={() => setSheet(false)} disabled={busy} />}
    </div>
  )
}

/** 名牌：她＝logo + 电子姬；你＝你的名字；屏幕消息＝来源；旁白没有名牌 */
function Plate({ beat, me, busy }: { beat: Beat | undefined; me: string; busy: boolean }) {
  const pill = `${d.plate} flex max-w-[60%] items-center gap-1.5 truncate rounded-full py-[3px] pr-3 text-[13px] leading-none font-bold tracking-wider text-white`
  if (beat?.kind === 'her' || (!beat && busy)) {
    return (
      <span className={`${pill} pl-[3px]`}>
        <img src={LOGO_URL} alt="" width={22} height={22} className="size-[22px] rounded-full ring-1 ring-white/80" />
        {CHAR_NAME}
      </span>
    )
  }
  if (beat?.kind === 'you') return <span className={`${pill} py-[7px] pl-3`}>{me || '你'}</span>
  if (beat?.kind === 'note') return <span className={`${pill} py-[7px] pl-3`}>{beat.source || '📄'}</span>
  return <span className="text-[11px] tracking-[0.4em] text-white/40">{beat ? '— 旁白 —' : ''}</span>
}

/** 刚发出去、第一个字还没到：「电子姬正在想」+ 三个跳动的点 */
function Thinking() {
  return (
    <span className="flex items-center gap-2 text-white/70">
      {CHAR_NAME}正在想
      <span className="inline-flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-blink rounded-full bg-white" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </span>
    </span>
  )
}

/**
 * 生成中：「● 正在写 · 对话」（区名用卡里分区的名字，SDK 的 useTurnProgress）+ 一条细进度。
 * compact（手机）：不要胶囊，一行小字压在一道发光细线上，写完自己收起。
 */
function WritingBar({ compact = false }: { compact?: boolean }) {
  const p = useTurnProgress()
  const text = p?.zone ? `正在写 · ${p.label}` : `${CHAR_NAME}在想…`
  const ratio = Math.max(0.04, p?.ratio ?? 0)
  const bar = (
    <span className="block h-full origin-left rounded-full bg-gradient-to-r from-[#ff5fa2] to-[#ffd23f] transition-transform duration-500" style={{ transform: `scaleX(${ratio})` }} />
  )
  if (compact) {
    return (
      <div role="status" aria-live="polite" className="animate-fade-in">
        <div className="flex items-center gap-2 pb-1.5 text-[11.5px] text-white/65">
          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-[#ffd23f]" />
          <span className="min-w-0 flex-1 truncate">{text}</span>
          {p?.ratio != null && <span className="shrink-0 text-[#ffd23f]/80 tabular-nums">{Math.round(ratio * 100)}%</span>}
        </div>
        <span className="block h-[2px] overflow-hidden rounded-full bg-white/10">{bar}</span>
      </div>
    )
  }
  return (
    <div role="status" aria-live="polite" className="relative flex h-10 items-center gap-2 overflow-hidden rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm text-white/75">
      <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-[#ffd23f]" />
      <span className="truncate">{text}</span>
      <span className="absolute inset-x-4 bottom-1 h-0.5 overflow-hidden rounded-full bg-white/12">{bar}</span>
    </div>
  )
}
