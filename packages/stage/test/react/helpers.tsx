import { act, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, vi } from 'vitest'
import { createSession, StageError, type StageClient, type StageEvent, type StageMessage, type StageSave, type StageSnapshot, type TurnHandlers } from '../../src/index'
import { SessionCtx } from '../../src/react/context'

/*
 * React 层：真实渲染（jsdom）。重点验「按区订阅」真的省了重渲染——AI 写正文时，订阅表情区的组件一次都不画。
 */

export type Sent = { text: string; h: TurnHandlers }
export function fakeStage(snap?: StageSnapshot) {
  const subs = new Set<(e: StageEvent) => void>()
  const emit = (e: StageEvent) => subs.forEach((f) => f(e))
  const sent: Sent[] = []
  let saveFails = false
  const stage = {
    load: vi.fn(async () => snap),
    send: async (text: string, h: TurnHandlers) => {
      sent.push({ text, h })
      return { id: 't', finished: Promise.resolve(''), close: () => {} }
    },
    resume: () => ({ id: 't', finished: Promise.resolve(''), close: () => {} }),
    save: vi.fn(async (state: StageSave | null, o?: { source?: string }) => {
      if (saveFails) {
        const e = new StageError('network', '网络连接失败')
        emit({ type: 'error', op: 'save', error: e })
        throw e
      }
      emit({ type: 'save', state, source: (o?.source ?? 'app') as never })
      return { ok: true as const, size: 1 }
    }),
    on: (fn: (e: StageEvent) => void) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    report: (op: never, error: StageError) => emit({ type: 'error', op, error }),
    siteUrl: (p: string) => p,
  } as unknown as StageClient
  return { stage, sent, emit, failSaves: (v: boolean) => (saveFails = v) }
}

export const slots = [{ zone: 'face', kind: 'yaml' }, { zone: 'narrative', kind: 'markdown' }, { zone: 'action' }]
export const msg = (id: number, role: 'user' | 'assistant', content: string): StageMessage => ({ id, role, kind: null, content })
export const snapOf = (p: Partial<StageSnapshot> = {}) =>
  ({
    card: { id: 'c', name: '测试卡' },
    slots,
    state_schema: { type: 'object' },
    image_pack: null,
    history: [msg(1, 'assistant', '<face>\n表情: normal\n</face>\n<narrative>\n开场\n</narrative>')],
    has_more: false,
    save: { love: 20 },
    streaming: null,
    ...p,
  }) as StageSnapshot

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