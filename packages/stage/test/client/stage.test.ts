import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStage, StageError } from '../../src/index'

/** 假 EventSource：测试里手动推事件 */
class FakeES {
  static last: FakeES
  static CLOSED = 2
  readyState = 0
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  listeners: Record<string, ((e: { data: string }) => void)[]> = {}
  closed = false
  constructor() {
    FakeES.last = this
  }
  addEventListener(name: string, fn: (e: { data: string }) => void) {
    ;(this.listeners[name] ??= []).push(fn)
  }
  close() {
    this.closed = true
    this.readyState = 2
  }
  emit(name: string, data = '{}') {
    if (name === 'message') this.onmessage?.({ data })
    else this.listeners[name]?.forEach((f) => f({ data }))
  }
}

const stage = () => createStage({ api: 'https://api.example.com/api/v1/stage', token: 'st_x' })

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeES)
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('收流', () => {
  it('正常：增量拼起来，done 只回调一次', async () => {
    const h = { onDelta: vi.fn(), onDone: vi.fn(), onFail: vi.fn() }
    const t = stage().resume({ turn_id: 't', stream_url: 'u' }, h)
    FakeES.last.emit('message', '{"c":"你"}')
    FakeES.last.emit('message', '{"c":"好"}')
    FakeES.last.emit('done')
    FakeES.last.emit('done')
    expect(h.onDelta).toHaveBeenLastCalledWith('你好', '好')
    expect(h.onDone).toHaveBeenCalledTimes(1)
    expect(await t.finished).toBe('你好')
    expect(FakeES.last.closed).toBe(true)
  })
  it('回调里抛错：这一轮照样结束（finished 照常给结果），错误只打日志', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const t = stage().resume({ turn_id: 't', stream_url: 'u' }, { onDone: () => { throw new Error('作者的 bug') } })
    FakeES.last.emit('message', '{"c":"好"}')
    FakeES.last.emit('done')
    expect(await t.finished).toBe('好')
    expect(FakeES.last.closed).toBe(true)
    expect(err).toHaveBeenCalled()
    err.mockRestore()
  })
  it('上游出错：fail → stream 错误、可重试', async () => {
    const h = { onFail: vi.fn() }
    const t = stage().resume({ turn_id: 't', stream_url: 'u' }, h)
    FakeES.last.emit('fail', '{"message":"上游超时"}')
    const e = h.onFail.mock.calls[0][0] as StageError
    expect(e.code).toBe('stream')
    expect(e.message).toBe('上游超时')
    expect(e.retryable).toBe(true)
    await expect(t.finished).rejects.toBeInstanceOf(StageError)
  })
  it('连接断了（浏览器放弃重连）：network，不再卡在生成中', () => {
    const h = { onFail: vi.fn(), onDone: vi.fn() }
    stage().resume({ turn_id: 't', stream_url: 'u' }, h)
    FakeES.last.readyState = 2
    FakeES.last.onerror?.()
    expect(h.onFail.mock.calls[0][0].code).toBe('network')
    expect(h.onDone).not.toHaveBeenCalled()
  })
  it('连续 3 次连不上：network；中间收到数据就清零', () => {
    const h = { onFail: vi.fn() }
    stage().resume({ turn_id: 't', stream_url: 'u' }, h)
    FakeES.last.onerror?.()
    FakeES.last.onerror?.()
    FakeES.last.emit('message', '{"c":"a"}')
    FakeES.last.onerror?.()
    FakeES.last.onerror?.()
    expect(h.onFail).not.toHaveBeenCalled()
    FakeES.last.onerror?.()
    expect(h.onFail).toHaveBeenCalledTimes(1)
  })
  it('2 分钟一个字都没来：network；有字来就续命', () => {
    const h = { onFail: vi.fn() }
    stage().resume({ turn_id: 't', stream_url: 'u' }, h)
    vi.advanceTimersByTime(100_000)
    FakeES.last.emit('message', '{"c":"a"}')
    vi.advanceTimersByTime(100_000)
    expect(h.onFail).not.toHaveBeenCalled()
    vi.advanceTimersByTime(30_000)
    expect(h.onFail.mock.calls[0][0].code).toBe('network')
  })
  it('坏数据跳过；主动 close 不触发任何回调', () => {
    const h = { onDelta: vi.fn(), onDone: vi.fn(), onFail: vi.fn() }
    const t = stage().resume({ turn_id: 't', stream_url: 'u' }, h)
    FakeES.last.emit('message', 'not json')
    t.close()
    FakeES.last.emit('done')
    vi.advanceTimersByTime(200_000)
    expect(h.onDelta).not.toHaveBeenCalled()
    expect(h.onDone).not.toHaveBeenCalled()
    expect(h.onFail).not.toHaveBeenCalled()
  })
})

describe('错误与网站地址', () => {
  it('retryable：能量 / token 再试没用', () => {
    expect(new StageError('insufficient', '').retryable).toBe(false)
    expect(new StageError('unauthorized', '').retryable).toBe(false)
    expect(new StageError('busy', '').retryable).toBe(true)
  })
  it('siteUrl：网站地址用 load() 返回的 site（签 token 时的域名），不从接口地址猜', async () => {
    const s = stage()
    expect(s.siteUrl('/recharge')).toBe('/recharge') // 还没 load：只给路径
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ site: 'http://localhost:5173', history: [] }), { status: 200 })))
    await s.load()
    expect(s.siteUrl('/recharge')).toBe('http://localhost:5173/recharge')
    expect(s.siteUrl('chat/c1?s=2')).toBe('http://localhost:5173/chat/c1?s=2')
    vi.unstubAllGlobals()
  })
})

describe('事件广播 stage.on', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('存好了：广播 save（带 source）；失败：广播 error（带是哪个操作）', async () => {
    const s = stage()
    const got: unknown[] = []
    s.on((e) => got.push(e.type === 'save' ? { type: e.type, source: e.source, state: e.state } : { type: e.type, op: e.op, code: e.error.code }))

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, size: 9 }), { status: 200 })))
    await s.save({ hp: 1 }, { source: 'panel' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'invalid', message: '存档不符合存档结构' } }), { status: 422 })))
    await expect(s.save({ hp: -1 })).rejects.toThrow('存档不符合存档结构')
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))))
    await expect(s.load()).rejects.toThrow()

    expect(got).toEqual([
      { type: 'save', source: 'panel', state: { hp: 1 } },
      { type: 'error', op: 'save', code: 'invalid' },
      { type: 'error', op: 'load', code: 'network' },
    ])
  })

  it('取消订阅后收不到；订阅方自己抛错不影响别人', async () => {
    const s = stage()
    const a = vi.fn(() => {
      throw new Error('订阅方的 bug')
    })
    const b = vi.fn()
    s.on(a)
    const off = s.on(b)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, size: 1 }), { status: 200 })))
    await s.save({})
    off()
    await s.save({})
    expect(a).toHaveBeenCalledTimes(2)
    expect(b).toHaveBeenCalledTimes(1)
  })
})

describe('请求', () => {
  afterEach(() => vi.unstubAllGlobals())
  /** 记下每次请求，按顺序回放给定的响应 */
  function fakeFetch(...responses: Response[]) {
    const calls: { url: string; init: RequestInit }[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return responses.shift() ?? new Response('{}', { status: 200 })
    }))
    return calls
  }
  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers })

  it('带 token；接口地址末尾的 / 去掉；load 的分页参数拼进查询', async () => {
    const calls = fakeFetch(json({ site: '', history: [] }), json({ site: '', history: [] }))
    const s = createStage({ api: 'https://api.example.com/api/v1/stage//', token: 'st_abc' })
    await s.load()
    await s.load({ limit: 20, before: 99 })
    expect(calls[0].url).toBe('https://api.example.com/api/v1/stage')
    expect(calls[1].url).toBe('https://api.example.com/api/v1/stage?limit=20&before=99')
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer st_abc')
    expect(calls[0].init.method).toBe('GET')
    expect(calls[0].init.body).toBeUndefined()
  })

  it('send：POST 原文，拿到回合就开始收流', async () => {
    const calls = fakeFetch(json({ turn_id: 't9', stream_url: 'https://s/t9' }))
    const t = await stage().send('我推开门', {})
    expect(calls[0].url).toMatch(/\/messages$/)
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ text: '我推开门' })
    expect(t.id).toBe('t9')
    expect(FakeES.last.closed).toBe(false)
  })

  it('send 失败（比如能量不足）：抛 StageError，不开流', async () => {
    fakeFetch(json({ error: { code: 'insufficient', message: '能量不够了' } }, 402))
    const before = FakeES.last
    const e = await stage().send('你好').catch((x) => x)
    expect(e).toBeInstanceOf(StageError)
    expect([e.code, e.status, e.retryable]).toEqual(['insufficient', 402, false])
    expect(FakeES.last).toBe(before)
  })

  it('save：PUT /save，整份发；keepalive 透传（关页面时也发得完）', async () => {
    const calls = fakeFetch(json({ ok: true, size: 9 }))
    expect(await stage().save({ hp: 1 }, { keepalive: true })).toEqual({ ok: true, size: 9 })
    expect(calls[0].init.method).toBe('PUT')
    expect(calls[0].url).toMatch(/\/save$/)
    expect(calls[0].init.keepalive).toBe(true)
  })

  it('gallery：GET /gallery；失败广播 op=gallery', async () => {
    const calls = fakeFetch(json({ turns: 3, previews: [], packs: [] }), json({}, 500))
    const s = stage()
    const ops: string[] = []
    s.on((e) => e.type === 'error' && ops.push(e.op))
    expect((await s.gallery()).turns).toBe(3)
    expect(calls[0].url).toMatch(/\/gallery$/)
    await expect(s.gallery()).rejects.toThrow('请求失败（500）') // 服务器没给说明：用状态码兜底
    expect(ops).toEqual(['gallery'])
  })

  it('太快了：带上 Retry-After 秒数；返回的不是 JSON 也不崩', async () => {
    fakeFetch(json({ error: { code: 'rate_limited', message: '慢一点' } }, 429, { 'Retry-After': '7' }), new Response('<html>502</html>', { status: 502 }))
    const a = await stage().load().catch((x) => x)
    expect([a.code, a.retryAfter, a.retryable]).toEqual(['rate_limited', 7, true])
    const b = await stage().load().catch((x) => x)
    expect([b.code, b.status]).toEqual(['error', 502])
  })
})

describe('其余方法', () => {
  it('思维链单独回调，不混进正文', () => {
    const h = { onDelta: vi.fn(), onReasoning: vi.fn() }
    stage().resume({ turn_id: 't', stream_url: 'u' }, h)
    FakeES.last.emit('message', '{"r":"想"}')
    FakeES.last.emit('message', '{"r":"想想"}')
    FakeES.last.emit('message', '{"c":"好"}')
    expect(h.onReasoning).toHaveBeenLastCalledWith('想想想', '想想')
    expect(h.onDelta).toHaveBeenCalledTimes(1)
    expect(h.onDelta).toHaveBeenLastCalledWith('好', '好')
  })

  it('fail 没带说明：用默认文案', () => {
    const h = { onFail: vi.fn() }
    stage().resume({ turn_id: 't', stream_url: 'u' }, h)
    FakeES.last.emit('fail', 'oops')
    expect(h.onFail.mock.calls[0][0].message).toBe('生成失败')
  })

  it('report：SDK 外的错误走同一条广播', () => {
    const s = stage()
    const got = vi.fn()
    s.on(got)
    const err = new StageError('error', '结算出错')
    s.report('turn', err)
    expect(got).toHaveBeenCalledWith({ type: 'error', op: 'turn', error: err })
  })

  it('tokenInfo：解 token；格式不对＝null', () => {
    expect(stage().tokenInfo()).toBeNull()
    const payload = btoa(JSON.stringify({ u: 1, s: 42, m: 'm', c: 'c', e: 1 }))
    expect(createStage({ api: 'x', token: `st_${payload}.sig` }).tokenInfo()?.sessionId).toBe(42)
  })
})

describe('没拿到连接', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('没 token / 没地址：不发请求，直接报 unauthorized（告诉玩家从网站进）', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    for (const conn of [{ api: 'https://api', token: '' }, { api: '', token: 'st_x' }, { api: undefined as unknown as string, token: undefined as unknown as string }]) {
      const e = await createStage(conn).load().catch((x) => x)
      expect([e.code, e.message]).toEqual(['unauthorized', '没有拿到进入凭证：请从电子姬网站进入这张卡'])
    }
    expect(fetch).not.toHaveBeenCalled()
  })
})

