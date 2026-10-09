import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StageError, type StageClient } from '@dianziji/stage'
import { createSettingsStore } from '@dianziji/stage-settings'
import { useVoice, type UseVoiceOptions } from '../src/useVoice'

const cast = [{ names: ['妈妈'], image: '', desc: '', voice: true }]

/** 假桥：speak 的每次调用都挂起，测试里手动 resolve / reject */
function fakeStage() {
  const calls: { text: string; ok: (u: string) => void; no: (e: unknown) => void }[] = []
  const stage = {
    snapshot: () => ({ characters: cast }),
    subscribe: () => () => {},
    speak: vi.fn((l: { text: string }) => new Promise((ok, no) => calls.push({ text: l.text, ok: (u: string) => ok({ url: u, cost: 20, cached: false }), no }))),
  } as unknown as StageClient
  return { stage, calls }
}

const lines = [
  { who: '妈妈', text: '第一句话来了。' },
  { who: '妈妈', text: '第二句话来了。' },
  { who: '妈妈', text: '第三句话来了。' },
]

let played: string[] = []
beforeEach(() => {
  played = []
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    played.push(this.src)
    return Promise.resolve()
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function setup(on = true, extra: Partial<UseVoiceOptions> = {}) {
  const { stage, calls } = fakeStage()
  const store = createSettingsStore(null)
  store.set({ voice: { on } })
  const h = renderHook((p: Partial<UseVoiceOptions>) => useVoice({ stage, store, lines, index: 0, ...extra, ...p }), { initialProps: {} })
  return { ...h, stage, calls, store }
}

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve() })

describe('useVoice', () => {
  it('配音默认关：一句都不请求，自动播放照旧按字数（voiced＝false）', () => {
    const { result, calls } = setup(false)
    expect(calls).toHaveLength(0)
    expect(result.current).toMatchObject({ state: 'off', voiced: false, busy: false })
  })

  it('开着：念当前这句；拿到了才预取下一句，同时只请求一句', async () => {
    const { result, calls, rerender } = setup()
    expect(calls.map((c) => c.text)).toEqual(['第一句话来了。'])
    expect(result.current).toMatchObject({ voiced: true, busy: true })
    await act(async () => calls[0].ok('https://r2.test/1.mp3'))
    await flush()
    expect(played).toEqual(['https://r2.test/1.mp3'])
    expect(calls.map((c) => c.text)).toEqual(['第一句话来了。', '第二句话来了。']) // 预取下一句，第三句还没请求
    await act(async () => calls[1].ok('https://r2.test/2.mp3'))
    rerender({ index: 1 })
    await flush()
    expect(played.at(-1)).toBe('https://r2.test/2.mp3') // 翻到第二句：预取好的直接播
  })

  it('出错一次：停下、把设置里的配音关掉、给一句提示；不再请求', async () => {
    const { result, calls, store } = setup()
    await act(async () => calls[0].no(new StageError('insufficient', '能量不够')))
    await flush()
    expect(store.get().voice.on).toBe(false)
    expect(result.current.state).toBe('halted')
    expect(result.current.notice).toContain('能量不够')
    act(() => result.current.dismiss())
    expect(result.current.notice).toBeNull()
    expect(calls).toHaveLength(1)
  })

  it('角色没配声音（no_voice）：跳过这句，不算出错', async () => {
    const { result, calls, store } = setup()
    await act(async () => calls[0].no(new StageError('no_voice', '没配声音')))
    await flush()
    expect(store.get().voice.on).toBe(true)
    expect(result.current.notice).toBeNull()
    expect(played).toEqual([])
  })

  it('生成中：最后一句可能没写完，不请求', () => {
    const { calls } = setup(true, { index: 2, streaming: true })
    expect(calls).toHaveLength(0)
  })

  it('暂停（玩家在干别的）：不请求；开关能切', () => {
    const { result, calls, store } = setup(true, { paused: true })
    expect(calls).toHaveLength(0)
    act(() => result.current.toggle())
    expect(store.get().voice.on).toBe(false)
  })
})

describe('useVoice · 生成中', () => {
  it('台词变长 / 这一轮写完换了 key：已经在念的那句不重播、不重取', async () => {
    const { calls, rerender } = setup(true, { streaming: true, lines: [lines[0], { who: '妈妈', text: '还在写' }] })
    await act(async () => calls[0].ok('https://r2.test/1.mp3'))
    await flush()
    expect(played).toEqual(['https://r2.test/1.mp3'])
    // 生成中又写了一个字：数组是新的，第一句没变
    rerender({ lines: [lines[0], { who: '妈妈', text: '还在写呢' }] })
    await flush()
    // 写完了：最后一句可以预取了，第一句仍不重播
    rerender({ streaming: false, lines: [lines[0], { who: '妈妈', text: '还在写呢。' }] })
    await flush()
    expect(played).toEqual(['https://r2.test/1.mp3'])
    expect(calls.map((c) => c.text)).toEqual(['第一句话来了。', '还在写呢。'])
  })
})

describe('useVoice · 往前看', () => {
  it('停在旁白上：后面要念的台词在后台一句一句取（同时只取一句，最多领先 2 句）', async () => {
    const mixed = [{ who: '', text: '' }, ...lines] // 第 0 句是旁白
    const { calls, result } = setup(true, { lines: mixed, index: 0 })
    expect(result.current).toMatchObject({ voiced: false, busy: false })
    expect(calls.map((c) => c.text)).toEqual(['第一句话来了。'])
    await act(async () => calls[0].ok('https://r2.test/1.mp3'))
    await flush()
    expect(calls.map((c) => c.text)).toEqual(['第一句话来了。', '第二句话来了。'])
    await act(async () => calls[1].ok('https://r2.test/2.mp3'))
    await flush()
    expect(calls).toHaveLength(2) // 领先 2 句就停，第三句等翻过去再取
    expect(played).toEqual([]) // 旁白上不念
  })
})

describe('useVoice · 玩家自己跳过', () => {
  it('她在念的时候点了下一句：停掉、暂停配音（不再取不再念）；点配音按钮恢复，从当前这句接着念', async () => {
    const { result, calls, rerender, store } = setup()
    await act(async () => calls[0].ok('https://r2.test/1.mp3'))
    await flush()
    act(() => result.current.interrupt())
    expect(result.current.state).toBe('suspended')
    expect(store.get().voice.on).toBe(true) // 设置不动
    const before = calls.length
    await act(async () => calls[1]?.ok('https://r2.test/2.mp3'))
    rerender({ index: 1 })
    await flush()
    expect(played).toEqual(['https://r2.test/1.mp3']) // 跳过之后不念
    expect(result.current.voiced).toBe(false)
    // 暂停着：这句早取好了 → 能单独点着念，不恢复自动配音
    expect(result.current.canReplay).toBe(true)
    act(() => result.current.replay())
    expect(played.at(-1)).toBe('https://r2.test/2.mp3')
    expect(result.current.state).toBe('suspended')
    played.pop()
    act(() => result.current.toggle())
    await flush()
    expect(result.current.state).not.toBe('suspended')
    expect(played.at(-1)).toBe('https://r2.test/2.mp3') // 恢复：当前这句（第二句，早取好了）接着念
    expect(calls.length).toBeGreaterThanOrEqual(before)
  })
  it('已经念完了再点下一句：不算跳过', () => {
    const { result } = setup(false)
    act(() => result.current.interrupt())
    expect(result.current.state).toBe('off')
  })
})

describe('useVoice · 手动生成一句', () => {
  it('配音关着：这句显示 idle；speakNow 取这一句、取到就播，不打开配音', async () => {
    const { result, calls, store } = setup(false)
    expect(result.current.lineState).toBe('idle')
    expect(calls).toHaveLength(0)
    act(() => result.current.speakNow())
    expect(calls.map((c) => c.text)).toEqual(['第一句话来了。'])
    expect(result.current.lineState).toBe('loading')
    await act(async () => calls[0].ok('https://r2.test/1.mp3'))
    await flush()
    expect(played).toEqual(['https://r2.test/1.mp3'])
    expect(result.current.lineState).toBe('ready')
    expect(store.get().voice.on).toBe(false)
    expect(calls).toHaveLength(1) // 关着：不顺带往后取
  })
  it('手动那句出错：只提示，不关配音', async () => {
    const { result, calls, store } = setup(false)
    act(() => result.current.speakNow())
    await act(async () => calls[0].no(new StageError('rate_limited', '太快了')))
    await flush()
    expect(result.current.notice).toContain('太快了')
    expect(store.get().voice.on).toBe(false)
    expect(result.current.state).toBe('off')
  })
  it('不能念的句子（太长 / 没声音）：blocked', () => {
    const { result } = setup(false, { lines: [{ who: '路人', text: '你好你好你好' }] })
    expect(result.current.lineState).toBe('blocked')
  })
})

describe('useVoice · auto: false（只要单句）', () => {
  it('设置里开着配音也不自动念、不预取；点了才生成并播放', async () => {
    const { result, calls } = setup(true, { auto: false })
    expect(calls).toHaveLength(0)
    expect(result.current).toMatchObject({ voiced: false, busy: false, lineState: 'idle' })
    act(() => result.current.speakNow())
    await act(async () => calls[0].ok('https://r2.test/1.mp3'))
    await flush()
    expect(played).toEqual(['https://r2.test/1.mp3'])
    expect(calls).toHaveLength(1)
  })
})
