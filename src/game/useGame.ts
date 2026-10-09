import { useCallback, useMemo, useState } from 'react'
import { imageUrl, stripImages, withState, type SessionState, type StageShortcut } from '@dianziji/stage'
import { shallowEqual, useStage, useStageActions, useZone, useZoneData, useZoneList, useZoneText } from '@dianziji/stage/react'
import { parseBeats, thoughtsOf } from './beats'
import { OPENING_FILM } from './content'
import { markSeen, seen } from './seen'
import { freshCgs, placeOf, playerOf, stateForAi, timeOf, type ClawSave, type GameSave } from './logic'

export type { ClawSave, GameSave, Status } from './logic'

/** 场景这类「一直该有个值」的区：这一轮还没写到用上一次的、写完才换（不闪半截值） */
const HOLD = { hold: true, complete: true }

/**
 * 这张卡的游戏状态（给 App）。聊天、收流、历史、存档、结算都是框架（useStage）做的；游戏规则在 rules.ts。
 * ★性能：这里只订阅「一轮才变一次」的东西（存档、历史、是否在生成、错误）和写完才换的场景——
 *   AI 一个字一个字写的时候 App 一次都不重画；旁白 / 对话、选项、心声由对话框 / 气泡自己按区订阅（useBeats / useChoices / useThought）。
 *   立绘不在这里：它跟着对话框正在播的那一句走（Dialogue 的 onFocus 交给 App）。
 */
export function useGame() {
  const s = useStage(
    (st: SessionState<GameSave>) => ({ snap: st.snap, history: st.history, hasOlder: st.hasOlder, busy: st.busy, said: st.said, error: st.error, save: st.save, lastTurn: st.lastTurn }),
    shallowEqual,
  )
  const { send: rawSend, setSave, retry, dismissError, loadOlder } = useStageActions<GameSave>()
  const { snap, save, lastTurn, history } = s
  const player = useMemo(() => playerOf(snap.setup, snap.user), [snap.setup, snap.user]) // 初始设定里的名字 / 称呼 + 站内头像

  // 画面：地点 / 时间（场景区 hold + complete），好感 / 心情 / 天数读存档
  const scene = useZoneData('scene', HOLD)
  const location = placeOf(scene, save.location)
  const time = timeOf(scene)
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
  // 舞台开场视频：新开的一局进来先放（点了才播，可跳过）；每一局只出现一次。放完 / 跳过之后才轮到开场 CG
  const [film, setFilm] = useState(() => {
    const key = `gal-opening-film:${snap.card.id}:${history[0]?.id ?? 0}`
    return OPENING_FILM && history.length <= 1 && !seen(key) ? key : null
  })
  const closeFilm = useCallback(() => {
    if (film) markSeen(film)
    setFilm(null)
  }, [film])

  const [shown, setShown] = useState({ turn: 0, count: 0, opening: false })
  const fresh = useMemo(() => (lastTurn ? freshCgs(lastTurn.prev.unlockedCg, lastTurn.next.unlockedCg, hasCg) : NO_CG), [lastTurn, hasCg])
  const turnN = lastTurn?.n ?? 0
  const idx = shown.turn === turnN ? shown.count : 0
  const cg = film ? null : (fresh[idx] ?? (shown.opening ? null : opening.cg))
  const closeCg = useCallback(() => {
    if (fresh[idx] !== undefined) return setShown((s) => ({ ...s, turn: turnN, count: idx + 1 }))
    markSeen(opening.key)
    setShown((s) => ({ ...s, opening: true }))
  }, [fresh, idx, turnN, opening.key])

  /** 抓娃娃每局结束改存档：存档器会把 0.8 秒内的连续改动合并成一次 */
  const updateClaw = useCallback((fn: (c: ClawSave) => ClawSave) => setSave((x) => ({ ...x, claw: fn(x.claw) })), [setSave])

  /** 发一句话：末尾附上此刻状态（<dj_state>，AI 看不到存档，靠它知道当前好感、地点……；附什么是这张卡自己定的） */
  const send = useCallback((text: string) => rawSend(withState(text, stateForAi(save, player.name || '主人'))), [rawSend, save, player.name])

  return { ...s, player, location, time, status, loveTick, cg, closeCg, film: film ? OPENING_FILM : null, closeFilm, updateClaw, send, retry, dismissError, loadOlder, cgUrl }
}

/**
 * 这一轮拆好的一句一句（旁白 → 你和她一来一回，规则在 beats.ts）。生成中跟着流长：最后一句可能是半截。
 * ★旁白不出图：AI 万一在旁白里写了 ![](编号) 也去掉（回忆 CG 只走 cg 区 → 全屏弹出）。
 */
export function useBeats() {
  const narrative = useZoneText('narrative')
  const talk = useZone('talk')?.value
  const said = useStage((st) => st.said) // 刚发出去的那句（对话区里还没有「我」时补在最前面）
  return useMemo(() => parseBeats(stripImages(narrative), talk, said), [narrative, talk, said])
}

/** 选项：生成中不给（还没写完） */
export function useChoices(): string[] {
  const list = useZoneList('action')
  const busy = useStage((st) => st.busy)
  return busy ? NONE : list
}

/** 心声：旁白里 > 💭 开头的那句；写完才给（生成中不冒气泡，也不沿用上一轮的） */
export function useThought(): string {
  const narrative = useZoneText('narrative', undefined, { complete: true })
  const busy = useStage((st) => st.busy)
  return useMemo(() => (busy ? '' : (thoughtsOf(narrative)[0] ?? '')), [busy, narrative])
}

const NONE: string[] = []
const NO_CG: number[] = []

const NO_SHORTCUTS: StageShortcut[] = []
/** 卡上的快捷指令（编辑器「快捷指令」，快照 shortcuts）。★卡上有的从快照读，舞台里不写一份；没配＝[] */
export function useShortcuts(): StageShortcut[] {
  return useStage((st) => st.snap?.shortcuts ?? NO_SHORTCUTS)
}
