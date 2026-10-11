import { useEffect, useState } from 'react'
import { useZoneData } from '@dianziji/stage/react'
import { FAVOR_STAGES } from './content'
import { backstageFrom, favorStage, weatherIcon, type Backstage } from './logic'

/** 后台进程那一行：好感到这里才看得见（之前打码锁着） */
export const PROCESS_UNLOCK = 40
const HOLD = { hold: true, complete: true }

type Props = {
  /** 她此刻的立绘（顶上圆章里露头和肩） */
  sprite: string
  love: number
  mood: string
  day: number
  time: string
  weather: string
  plan: string
  coins: number
  cgCount: number
  thought: string
  onClose: () => void
}

/**
 * 状态弹窗（点顶栏的好感框）：和提示弹窗同一个奶油卡片样子，内容分三块——
 *   ① 好感：数值 + 进度条 + 阶段名和一句说明 + 离下一阶段还差多少；
 *   ② 今天：第几天 · 天气 · 时间、她的今日安排、心情、硬币、回忆；
 *   ③ 系统后台：她自己看不见、你偷看得到的那块（system 区，最近一轮写的）——电量条、心跳、CPU 温度、新学会、后台进程、存进 C 盘。
 *      「后台进程」是她没说出口的念头：好感不到 40 打码锁着，点一下提示怎么解锁。
 * 挂了才渲染；点遮罩 / Esc / 「好的」关。只动 transform / opacity，遮罩不用 blur。
 */
export default function StatusSheet(p: Props) {
  const { onClose } = p
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const back = backstageFrom(useZoneData('system', HOLD)) // 打开时才订阅
  const stage = favorStage(p.love)
  const nextStage = FAVOR_STAGES.find((s) => s.min > p.love)
  const icon = weatherIcon(p.weather)

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center px-5" role="dialog" aria-modal="true" aria-label="和电子姬的状态" data-no-advance onContextMenu={(e) => e.stopPropagation()}>
      <button aria-label="关闭" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-in cursor-default bg-black/40" />
      <div className="relative flex max-h-[calc(100dvh-112px)] w-full max-w-[380px] animate-tip-in flex-col rounded-[28px] border-2 border-white bg-[#fff8f1] px-5 pt-14 pb-5 text-[#4a2f2a] shadow-[0_6px_0_#f9c5d8,0_24px_50px_-12px_rgba(0,0,0,0.45)]">
        <span className="absolute -top-11 left-1/2 grid size-[88px] -translate-x-1/2 place-items-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-amber-200 via-pink-300 to-rose-400 text-3xl shadow-[0_4px_0_#e879a6]">
          {p.sprite ? <img src={p.sprite} alt="" decoding="async" className="size-full origin-top scale-[1.9] object-cover object-top" /> : '♥'}
        </span>
        <div className="shrink-0 text-center text-[17px] font-black tracking-wide">和电子姬的状态</div>
        {/* ★只有中间这段滚：卡片本身不裁，顶上压出去的圆章才不会被切掉 */}
        <div className="-mx-2 mt-3 min-h-0 space-y-2.5 overflow-y-auto overscroll-contain px-2 pb-1">
          {/* ① 好感 */}
          <section className="rounded-2xl bg-white px-3.5 py-3 shadow-[0_4px_12px_-8px_rgba(236,72,153,0.4)]">
            <div className="flex items-baseline gap-2">
              <b className="text-sm">♥ 好感</b>
              <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-bold text-pink-500">{stage.name}</span>
              <span className="ml-auto text-sm font-black text-pink-500 tabular-nums">{p.love} / 100</span>
            </div>
            <span className="relative mt-2 block h-2 overflow-hidden rounded-full bg-pink-100">
              <span className="block h-full origin-left rounded-full bg-gradient-to-r from-[#ffd23f] to-[#ff5fa2]" style={{ transform: `scaleX(${p.love / 100})` }} />
            </span>
            <p className="mt-1.5 text-xs leading-5 text-[#9a7b72]">
              {stage.hint}
              {nextStage && <span className="text-pink-500">（再 +{nextStage.min - p.love} 进入「{nextStage.name}」）</span>}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-[#b89a90]">温柔陪伴、认真夸她会涨，敷衍冷落会降（每轮最多 ±5）；掷骰检定成功也会涨。</p>
          </section>

          {/* ② 今天 */}
          <section className="rounded-2xl bg-white px-3.5 py-3 text-sm shadow-[0_4px_12px_-8px_rgba(236,72,153,0.4)]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <b>📅 第 {p.day} 天</b>
              {p.weather && (
                <span className="text-[#9a7b72]">
                  {icon} {p.weather}
                </span>
              )}
              {p.time && <span className="text-[#9a7b72] tabular-nums">{p.time}</span>}
            </div>
            {p.plan && (
              <p className="mt-1.5 text-xs leading-5">
                <span className="text-[#9a7b72]">她今天想：</span>
                {p.plan}
              </p>
            )}
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-xs">
              <Chip label="心情" value={p.mood || '—'} />
              <Chip label="硬币" value={`🪙 ${p.coins}`} />
              <Chip label="回忆" value={`${p.cgCount} / 8`} />
            </div>
            {p.thought && <p className="mt-2 rounded-xl bg-pink-50 px-2.5 py-1.5 text-xs leading-5 text-[#8a4a6a] italic">💭 {p.thought}</p>}
          </section>

          {/* ③ 系统后台 */}
          <Terminal back={back} love={p.love} />
        </div>
        <button onClick={onClose} className="mt-4 shrink-0 rounded-full border-2 border-pink-200 bg-white py-2.5 text-sm font-bold text-[#9a7b72] shadow-[0_3px_0_#fbcfe0] active:translate-y-0.5 active:shadow-none">
          好的
        </button>
      </div>
    </div>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0 rounded-xl bg-[#fff8f1] px-1.5 py-1.5">
      <span className="block text-[10px] text-[#9a7b72]">{label}</span>
      <b className="block truncate">{value}</b>
    </span>
  )
}

/** 系统后台：深紫小终端（和日志 log.txt 同一套颜色）。最近一轮没写 system 区＝提示还没数据 */
function Terminal({ back, love }: { back: Backstage | null; love: number }) {
  const [peek, setPeek] = useState(false) // 点了锁着的那一行：提示怎么解锁
  const locked = love < PROCESS_UNLOCK
  const battery = back?.battery ?? null
  return (
    <section className="rounded-2xl bg-[#1d1636] px-3.5 py-3 font-mono text-[12px] leading-6 text-[#f3eaff] shadow-[0_6px_16px_-8px_rgba(29,22,54,0.7)]">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-[#8f82ad]">
        <span className="size-2 rounded-full bg-[#28c840]" />
        <span className="flex-1">系统后台 · 她自己看不见</span>
        <span>system.log</span>
      </div>
      {!back ? (
        <p className="text-[#8f82ad]">&gt; 还没有数据，和她多聊几句再来看。</p>
      ) : (
        <>
          {battery !== null && (
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[#ff7eb6]">电量</span>
              <span className="relative block h-2.5 flex-1 overflow-hidden rounded-sm border border-white/25">
                <span className={`block h-full origin-left ${battery <= 20 ? 'bg-[#ff5f57]' : battery <= 50 ? 'bg-[#ffd23f]' : 'bg-[#28c840]'}`} style={{ transform: `scaleX(${battery / 100})` }} />
              </span>
              <span className="w-10 shrink-0 text-right tabular-nums">{battery}%</span>
            </div>
          )}
          {back.heart !== null && <Row k="心跳" v={`${back.heart} bpm${back.heart >= 120 ? ' ♥♥' : back.heart >= 100 ? ' ♥' : ''}`} />}
          {back.temp && <Row k="CPU温度" v={back.temp} />}
          {back.learned && <Row k="新学会" v={back.learned} />}
          {back.process && (
            <div className="flex gap-2">
              <span className="w-16 shrink-0 text-[#ff7eb6]">后台进程</span>
              {locked ? (
                <button onClick={() => setPeek(true)} className="min-w-0 flex-1 text-left" aria-label={`后台进程：好感到 ${PROCESS_UNLOCK} 解锁`}>
                  <span className="select-none tracking-widest text-[#5c5078]">{'█'.repeat(Math.min(10, Math.max(4, Math.round(back.process.length / 2))))}</span>
                  <span className="ml-1.5 text-[#ffd23f]">🔒</span>
                  {peek && <span className="mt-0.5 block animate-fade-in text-[11px] text-[#ffd23f]">ACCESS DENIED · 好感到 {PROCESS_UNLOCK} 才能偷看她在想什么</span>}
                </button>
              ) : (
                <span className="min-w-0 flex-1 break-words">{back.process}</span>
              )}
            </div>
          )}
          {back.saved && <Row k="存进C盘" v={back.saved} />}
        </>
      )}
    </section>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 text-[#ff7eb6]">{k}</span>
      <span className="min-w-0 flex-1 break-words">{v}</span>
    </div>
  )
}
