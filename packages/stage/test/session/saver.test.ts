import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSaver } from '../../src/session/saver'
import { StageError, type SaveSource, type StageClient, type StageEvent, type StageSave } from '../../src/index'

/** 假的 stage：记下每次 save 的内容，手动决定什么时候回来 */
function fakeStage() {
  const calls: { body: unknown; keepalive?: boolean; source?: SaveSource; done: (ok: boolean) => void }[] = []
  const subs = new Set<(e: StageEvent) => void>()
  const stage = {
    save: (body: unknown, opts?: { keepalive?: boolean; source?: SaveSource }) =>
      new Promise((ok, fail) => calls.push({ body, keepalive: opts?.keepalive, source: opts?.source, done: (y) => (y ? ok({ ok: true, size: 1 }) : fail(new StageError('network', '断了'))) })),
    on: (fn: (e: StageEvent) => void) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
  } as unknown as StageClient
  /** 模拟别处（本局面板）存了一份 */
  const external = (state: StageSave) => subs.forEach((f) => f({ type: 'save', state, source: 'panel' }))
  return { stage, calls, external }
}
/** 让排着的 Promise 回调都跑完（定时器是假的，不能用 setTimeout 等） */
const tick = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

/** 测试环境（node）没有页面：用 EventTarget 造一个最小的 document / window */
const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' })

describe('createSaver', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.stubGlobal('document', doc)
    vi.stubGlobal('window', new EventTarget())
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    doc.visibilityState = 'visible'
  })

  it('delay 内的多次改动只发最后一份', async () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage, { delay: 800 })
    s.save({ a: 1 })
    s.save({ a: 2 })
    s.save({ a: 3 })
    expect(calls).toHaveLength(0)
    vi.advanceTimersByTime(800)
    expect(calls.map((c) => c.body)).toEqual([{ a: 3 }])
    s.dispose()
  })

  it('now：立刻发；状态 saving → saved', async () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage)
    s.save({ a: 1 }, { now: true })
    expect(s.status.state).toBe('saving')
    calls[0].done(true)
    await tick()
    expect(s.status.state).toBe('saved')
    expect(s.status.at).toBeGreaterThan(0)
    s.dispose()
  })

  it('路上有一个时又来新的：等它回来再发最新那份，不并发、不丢', async () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage)
    s.save({ a: 1 }, { now: true })
    s.save({ a: 2 }, { now: true })
    s.save({ a: 3 }, { now: true })
    expect(calls).toHaveLength(1)
    calls[0].done(true)
    await tick()
    await tick()
    expect(calls.map((c) => c.body)).toEqual([{ a: 1 }, { a: 3 }])
    expect(s.status.state).toBe('saving')
    calls[1].done(true)
    await tick()
    expect(s.status.state).toBe('saved')
    s.dispose()
  })

  it('失败：状态 error、不自动重试；saveNow 把那份再发一次', async () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage)
    s.save({ a: 1 }, { now: true })
    calls[0].done(false)
    await tick()
    await tick()
    expect(s.status.state).toBe('error')
    expect(calls).toHaveLength(1)
    s.saveNow()
    expect(calls.map((c) => c.body)).toEqual([{ a: 1 }, { a: 1 }])
    calls[1].done(true)
    await tick()
    expect(s.status.state).toBe('saved')
    s.dispose()
  })

  it('页面切到后台：没发的立刻用 keepalive 发', () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage)
    s.save({ a: 1 })
    doc.visibilityState = 'hidden'
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(calls).toEqual([expect.objectContaining({ body: { a: 1 }, keepalive: true })])
    s.dispose()
  })

  it('reset：被别处整份换掉了，丢掉还没发的旧改动', () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage)
    s.save({ a: 1 })
    s.reset({ a: 9 })
    vi.advanceTimersByTime(2000)
    expect(calls).toHaveLength(0)
    s.saveNow()
    expect(calls.map((c) => c.body)).toEqual([{ a: 9 }])
    expect(calls[0].source).toBe('manual')
    s.dispose()
  })

  it('别处（本局面板）存了：自动丢掉还没发的旧改动', () => {
    const { stage, calls, external } = fakeStage()
    const s = createSaver(stage)
    s.save({ a: 1 })
    external({ a: 7 })
    vi.advanceTimersByTime(2000)
    expect(calls).toHaveLength(0)
    expect(s.status.state).toBe('saved')
    s.dispose()
  })

  it('自动存的 source 是 saver', () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage)
    s.save({ a: 1 }, { now: true })
    expect(calls[0].source).toBe('saver')
    s.dispose()
  })
})

describe('createSaver · 边角', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.stubGlobal('document', doc)
    vi.stubGlobal('window', new EventTarget())
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    doc.visibilityState = 'visible'
  })

  it('关页面（pagehide）：没发的立刻用 keepalive 发；没有没发的就不发', () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage)
    window.dispatchEvent(new Event('pagehide'))
    expect(calls).toHaveLength(0)
    s.save({ a: 1 })
    window.dispatchEvent(new Event('pagehide'))
    expect(calls).toEqual([expect.objectContaining({ body: { a: 1 }, keepalive: true })])
    s.dispose()
  })

  it('切后台时没有没发的：不发', () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage)
    doc.visibilityState = 'hidden'
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(calls).toHaveLength(0)
    s.dispose()
  })

  it('还没存过：手动保存什么都不做', () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage)
    s.saveNow()
    expect(calls).toHaveLength(0)
    s.dispose()
  })

  it('flush：有没发的立刻发（可带 keepalive）；路上有一个就等它回来再发最新的', async () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage)
    await s.flush()
    expect(calls).toHaveLength(0)
    s.save({ a: 1 }, { now: true })
    s.save({ a: 2 })
    const done = s.flush({ keepalive: true })
    expect(calls).toHaveLength(1)
    calls[0].done(true)
    await tick()
    expect(calls[1]).toMatchObject({ body: { a: 2 }, keepalive: true })
    calls[1].done(true)
    await done
    expect(s.status.state).toBe('saved')
    s.dispose()
  })

  it('失败时已经有更新的改动：留更新的那份，不拿旧的盖回来', async () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage)
    s.save({ a: 1 }, { now: true })
    s.save({ a: 2 })
    calls[0].done(false)
    await tick()
    expect(s.status.state).toBe('error')
    s.saveNow()
    expect(calls.at(-1)?.body).toEqual({ a: 2 })
    s.dispose()
  })

  it('dispose 之后：页面事件、别处存档都不再理', () => {
    const { stage, calls, external } = fakeStage()
    const s = createSaver(stage)
    s.save({ a: 1 })
    s.dispose()
    window.dispatchEvent(new Event('pagehide'))
    external({ a: 9 })
    expect(calls).toHaveLength(0)
    expect(s.status.state).toBe('idle')
  })
})

describe('createSaver · 关页面时路上有一个', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.stubGlobal('document', doc)
    vi.stubGlobal('window', new EventTarget())
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('等它回来接着发的最新那份也带 keepalive（不然页面一关就丢）', async () => {
    const { stage, calls } = fakeStage()
    const s = createSaver(stage)
    s.save({ a: 1 }, { now: true })
    s.save({ a: 2 })
    window.dispatchEvent(new Event('pagehide'))
    calls[0].done(true)
    await tick()
    expect(calls.map((c) => [c.body, c.keepalive])).toEqual([[{ a: 1 }, false], [{ a: 2 }, true]])
    calls[1].done(true)
    await tick()
    s.save({ a: 3 }, { now: true })
    expect(calls[2].keepalive).toBe(false) // 用过就清：之后的普通存档不带
    s.dispose()
  })
})
