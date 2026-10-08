import { act, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, vi } from 'vitest'
import { createSession, splitState, StageError, type SnapshotListener, type StageClient, type StageErrorCode, type StageEvent, type StageMessage, type StageSave, type StageSnapshot } from '../../src/index'
import { SessionCtx } from '../../src/react/context'

/*
 * React 层：真实渲染（jsdom）。重点验「按区订阅」真的省了重渲染——AI 写正文时，订阅表情区的组件一次都不画。
 */

/**
 * 假的网站：舞台的请求记下来；push 模拟网站推快照。
 * stage.send 被网站接受后，网站马上开始这一轮（推 live）；delta / done / fail＝之后流式长字、写完、失败。
 */
export function fakeStage(snap: StageSnapshot = snapOf()) {
  let cur = snap
  let id = 100
  const subs = new Set<(e: StageEvent) => void>()
  const snapSubs = new Set<SnapshotListener>()
  const emit = (e: StageEvent) => subs.forEach((f) => f(e))
  const push = (patch: Partial<StageSnapshot>) => {
    cur = { ...cur, ...patch }
    snapSubs.forEach((f) => f(cur, Object.keys(patch) as (keyof StageSnapshot)[]))
  }
  const sent: string[] = []
  let saveFails = false
  const stage = {
    ready: vi.fn(async () => cur),
    snapshot: () => cur,
    subscribe: (fn: SnapshotListener) => {
      snapSubs.add(fn)
      return () => snapSubs.delete(fn)
    },
    send: async (text: string) => {
      sent.push(text)
      push({ history: [...cur.history, msg(++id, 'user', text)], live: { said: splitState(text).text, text: '', reasoning: '' }, error: null })
    },
    stop: async () => {},
    regenerate: async () => {},
    older: async () => {},
    save: vi.fn(async (state: StageSave | null, o?: { source?: string }) => {
      if (saveFails) {
        const e = new StageError('network', '网络连接失败')
        emit({ type: 'error', op: 'save', error: e })
        throw e
      }
      emit({ type: 'save', state, source: (o?.source ?? 'app') as never })
      return { size: 1 }
    }),
    on: (fn: (e: StageEvent) => void) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    report: (op: never, error: StageError) => emit({ type: 'error', op, error }),
    siteUrl: (p: string) => p,
    open: () => true,
  } as unknown as StageClient
  return {
    stage,
    sent,
    emit,
    push,
    failSaves: (v: boolean) => (saveFails = v),
    /** 流式：到目前为止的全文 */
    delta: (text: string, reasoning = '') => push({ live: { ...cur.live!, text, reasoning } }),
    /** 写完：live 收起 + 历史带上最终那条（同一次推） */
    done: (text: string) => push({ live: null, history: [...cur.history, msg(++id, 'assistant', text)] }),
    fail: (code: StageErrorCode, message: string) => push({ live: null, error: { code, message } }),
  }
}

export const slots = [{ zone: 'face', kind: 'yaml' }, { zone: 'narrative', kind: 'markdown' }, { zone: 'action' }]
export const msg = (id: number, role: 'user' | 'assistant', content: string): StageMessage => ({ id, role, kind: null, content })
export function snapOf(p: Partial<StageSnapshot> = {}): StageSnapshot {
  return {
    card: { id: 'c', name: '测试卡' },
    site: 'https://site.test',
    user: null,
    asset_base: '',
    slots,
    state_schema: { type: 'object' },
    image_pack: null,
    setup: { text: '', fields: [] },
    history: [msg(1, 'assistant', '<face>\n表情: normal\n</face>\n<narrative>\n开场\n</narrative>')],
    has_more: false,
    save: { love: 20 },
    live: null,
    error: null,
    meta: { model: 'm', channel: 'c', dev: false },
    safe_area: { top: 0, right: 0, bottom: 0, left: 0 },
    ...p,
  } as StageSnapshot
}

export function withSession(snap = snapOf()) {
  const f = fakeStage(snap)
  const session = createSession<{ love: number }>({ stage: f.stage, snapshot: snap })
  const wrap = ({ children }: { children: ReactNode }) => <SessionCtx.Provider value={session as never}>{children}</SessionCtx.Provider>
  return { ...f, session, wrap }
}

/** 每个 React 测试文件开头调一次：假计时器（分区解析在下一帧）+ 每个用例后卸载 */
export function setupReactTests() {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] }))
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })
}

/** 推进一帧（分区解析在下一帧） */
export const frame = () => act(() => void vi.advanceTimersByTime(20))