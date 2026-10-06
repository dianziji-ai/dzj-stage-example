import { useCallback, useMemo, useState } from 'react'
import { imageUrl, stripImages, withState, type SessionState } from '@dianziji/stage'
import { shallowEqual, useStage, useStageActions, useZoneData, useZoneList, useZoneText } from '@dianziji/stage/react'
import { exprOf, freshCgs, placeOf, playerOf, stateForAi, thoughtOf, timeOf, type ClawSave, type GameSave } from './logic'

export type { ClawSave, GameSave, Status } from './logic'

/** 表情、场景这类区：这一轮还没写到用上一次的、写完才换（不闪半截值） */
const HOLD = { hold: true, complete: true }

/**
 * 这张卡的游戏状态（给 App）。聊天、收流、历史、存档、结算都是框架（useStage）做的；游戏规则在 rules.ts。
 * ★性能：这里只订阅「一轮才变一次」的东西（存档、历史、是否在生成、错误）和写完才换的场景 / 表情——
 *   AI 一个字一个字写的时候 App 一次都不重画；正文、选项、心声由对话框 / 气泡自己按区订阅（useDialogue / useThought）。
 */
export function useGame() {
  const s = useStage(
    (st: SessionState<GameSave>) => ({ snap: st.snap, history: st.history, hasOlder: st.hasOlder, busy: st.busy, said: st.said, error: st.error, save: st.save, lastTurn: st.lastTurn }),
    shallowEqual,
  )
  const { send: rawSend, setSave, retry, dismissError, loadOlder } = useStageActions<GameSave>()
  const { snap, save, lastTurn, history } = s
  const player = useMemo(() => playerOf(snap.setup, snap.user), [snap.setup, snap.user]) // 初始设定里的名字 / 称呼 + 站内头像

  // 画面：地点 / 时间 / 表情（场景、表情区 hold + complete），好感 / 心情 / 天数读存档
  const scene = useZoneData('scene', HOLD)
  const face = useZoneData('face', HOLD)
  const location = placeOf(scene, save.location)
  const time = timeOf(scene)
  const expr = exprOf(face)
  const status = useMemo(() => ({ 好感: save.love, 心情: save.mood, 天数: save.day }), [save.love, save.mood, save.day])

  // 好感飘字：每次结算好感变了多少；n 当 key 让飘字重播
  const loveTick = useMemo(() => ({ delta: lastTurn ? lastTurn.next.love - lastTurn.prev.love : 0, n: lastTurn?.n ?? 0 }), [lastTurn])

  /** 配图库编号 → 地址（没有＝''） */
  const cgUrl = useCallback((n: number) => imageUrl(snap, n) ?? '', [snap])
  const hasCg = useCallback((n: number) => cgUrl(n) !== '', [cgUrl])

  // 弹出的 CG：这次结算新解锁的，一张一张弹（关一张弹下一张）；刚开局时开场自带的那张这一局只弹一次（看过记在本机）
  // （图册里点开的另算，App 管）
  const [opening] = useState(() => {
    const key = `gal-opening-cg:${snap.card.id}:${history[0]?.id ?? 0}` // 开场那条消息的 id：每一局各记各的
    const n = history.length <= 1 ? save.unlockedCg[0] : undefined
    return { key, cg: n !== undefined && hasCg(n) && !seen(key) ? n : null }
  })
  const [shown, setShown] = useState({ turn: 0, count: 0, opening: false })
  const fresh = useMemo(() => (lastTurn ? freshCgs(lastTurn.prev.unlockedCg, lastTurn.next.unlockedCg, hasCg) : NO_CG), [lastTurn, hasCg])
  const turnN = lastTurn?.n ?? 0
  const idx = shown.turn === turnN ? shown.count : 0
  const cg = fresh[idx] ?? (shown.opening ? null : opening.cg)
  const closeCg = useCallback(() => {
    if (fresh[idx] !== undefined) return setShown((s) => ({ ...s, turn: turnN, count: idx + 1 }))
    markSeen(opening.key)
    setShown((s) => ({ ...s, opening: true }))
  }, [fresh, idx, turnN, opening.key])

  /** 抓娃娃每局结束改存档：存档器会把 0.8 秒内的连续改动合并成一次 */
  const updateClaw = useCallback((fn: (c: ClawSave) => ClawSave) => setSave((x) => ({ ...x, claw: fn(x.claw) })), [setSave])

  /** 发一句话：末尾附上此刻状态（<dj_state>，AI 看不到存档，靠它知道当前好感、地点……；附什么是这张卡自己定的） */
  const send = useCallback((text: string) => rawSend(withState(text, stateForAi(save, player.name || '主人'))), [rawSend, save, player.name])

  return { ...s, player, location, time, expr, status, loveTick, cg, closeCg, updateClaw, send, retry, dismissError, loadOlder, cgUrl }
}

/**
 * 对话框要的：正文（跟着流一个字一个字变）、选项（写完才给）。AI 写字时只有用它的对话框更新。
 * （正在写哪个区 + 进度在输入栏里，用 SDK 的 useTurnProgress）
 */
export function useDialogue() {
  // 正文不出图：AI 万一在正文里写了 ![](编号) 也去掉（回忆 CG 只走 cg 区 → 全屏弹出）
  const raw = useZoneText('narrative')
  const body = useMemo(() => stripImages(raw), [raw])
  const list = useZoneList('action')
  const busy = useStage((st) => st.busy)
  return { body, choices: busy ? NONE : list }
}

/** 心声：只取这一轮的、写完才给（生成中不冒气泡，也不沿用上一轮的） */
export function useThought(): string {
  const t = useZoneText('thought', '心声')
  const busy = useStage((st) => st.busy)
  return busy ? '' : thoughtOf(t)
}

const NONE: string[] = []
const NO_CG: number[] = []

/** 本机记一笔「看过了」（隐私模式下 localStorage 会抛：记不住就下次再弹一次，不影响玩） */
function seen(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
function markSeen(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* 记不住就算了 */
  }
}
