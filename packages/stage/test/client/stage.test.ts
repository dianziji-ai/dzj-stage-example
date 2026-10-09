import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStage, PROTOCOL, StageError, type StageEvent, type StageSnapshot } from '../../src/index'

const SITE = 'https://site.test'

/** 假的外层网站：记下舞台发来的消息；deliver 模拟网站往舞台发消息 */
function fakeSite() {
  const sent: { m: { type: string; id?: string; method?: string; args?: unknown; sdk?: string }; o: string }[] = []
  const parent = { postMessage: (m: never, o: string) => sent.push({ m, o }) } as unknown as Window
  const ls = new Set<(e: unknown) => void>()
  const self = {
    addEventListener: (_t: string, f: (e: unknown) => void) => ls.add(f),
    removeEventListener: (_t: string, f: (e: unknown) => void) => ls.delete(f),
  } as unknown as Window
  const deliver = (data: unknown, o: { origin?: string; source?: unknown } = {}) =>
    ls.forEach((f) => f({ data, origin: o.origin ?? SITE, source: o.source === undefined ? parent : o.source }))
  const requests = () => sent.filter((x) => x.m.type === 'request').map((x) => x.m)
  return {
    sent,
    parent,
    self,
    deliver,
    init: (snap: StageSnapshot) => deliver({ dzj: 'stage', v: PROTOCOL, type: 'init', snapshot: snap }),
    update: (patch: Partial<StageSnapshot>) => deliver({ dzj: 'stage', v: PROTOCOL, type: 'update', patch }),
    requests,
    lastRequest: () => requests().at(-1)!,
    reply: (id: string, data?: unknown) => deliver({ dzj: 'stage', v: PROTOCOL, type: 'response', id, ok: true, data }),
    refuse: (id: string, code: string, message: string) => deliver({ dzj: 'stage', v: PROTOCOL, type: 'response', id, ok: false, error: { code, message } }),
  }
}

export const snapOf = (p: Partial<StageSnapshot> = {}): StageSnapshot => ({
  card: { id: 'c1', name: '卡', avatar: '', background: '', menu_background: '' },
  site: SITE,
  user: null,
  asset_base: 'https://img.test',
  slots: [],
  state_schema: null,
  image_pack: null,
  setup: { text: '', fields: [] },
  shortcuts: [],
  bgm: [],
  characters: [],
  history: [{ id: 1, role: 'assistant', kind: 'opening', content: '开场' }],
  has_more: false,
  save: null,
  live: null,
  error: null,
  meta: { model: 'm', channel: 'c', dev: false },
  safe_area: { top: 0, right: 0, bottom: 0, left: 0 },
  ...p,
})

async function connected() {
  const site = fakeSite()
  const stage = createStage({ parent: site.parent, self: site.self })
  const ready = stage.ready()
  site.init(snapOf())
  await ready
  return { site, stage }
}

afterEach(() => vi.useRealTimers())

describe('握手', () => {
  it('ready：先发 ready（目标 *，只带 SDK 版本），收到 init 就拿到快照；之后只往那个网站发', async () => {
    const site = fakeSite()
    const stage = createStage({ parent: site.parent, self: site.self })
    expect(stage.snapshot()).toBeNull()
    const p = stage.ready()
    expect(site.sent[0]).toMatchObject({ m: { type: 'ready', dzj: 'stage', v: PROTOCOL }, o: '*' })
    site.init(snapOf())
    expect((await p).card.id).toBe('c1')
    expect(stage.snapshot()?.card.id).toBe('c1')
    void stage.send('你好').catch(() => {})
    expect(site.sent.at(-1)).toMatchObject({ m: { type: 'request', method: 'send' }, o: SITE })
  })

  it('网站老一点、没发 0.3.3 加的字段：补成空的，舞台拿不到 undefined', async () => {
    const site = fakeSite()
    const stage = createStage({ parent: site.parent, self: site.self })
    const p = stage.ready()
    const old = snapOf() as Record<string, unknown>
    delete old.shortcuts
    delete old.bgm
    delete old.characters
    old.card = { id: 'c1', name: '卡' }
    site.init(old as never)
    const s = await p
    expect(s.shortcuts).toEqual([])
    expect(s.bgm).toEqual([])
    expect(s.characters).toEqual([])
    expect(s.card).toEqual({ id: 'c1', name: '卡', avatar: '', background: '', menu_background: '' })
  })

  it('网站没发 0.4.0 的 characters[].voice：补成 false', async () => {
    const site = fakeSite()
    const stage = createStage({ parent: site.parent, self: site.self })
    const p = stage.ready()
    site.init({ ...snapOf(), characters: [{ names: ['妈妈'], image: '', desc: '' }] } as never)
    expect((await p).characters).toEqual([{ names: ['妈妈'], image: '', desc: '', voice: false }])
  })

  it('不在网站里（没有外层窗口）：ready 直接失败，说请在网站里打开', async () => {
    const site = fakeSite()
    const stage = createStage({ self: site.self })
    await expect(stage.ready()).rejects.toMatchObject({ code: 'unauthorized', message: '请在电子姬网站里打开这张卡' })
  })

  it('外层网站一直不给快照：3 秒后失败；期间隔一会儿重发 ready', async () => {
    vi.useFakeTimers()
    const site = fakeSite()
    const stage = createStage({ parent: site.parent, self: site.self })
    const p = stage.ready()
    const fail = expect(p).rejects.toMatchObject({ code: 'unauthorized' })
    await vi.advanceTimersByTimeAsync(3100)
    await fail
    expect(site.sent.filter((x) => x.m.type === 'ready').length).toBeGreaterThan(3)
  })

  it('只认外层网站、只认桥上的消息、只认第一次 init 的来源、只认同一版协议', async () => {
    const { site, stage } = await connected()
    const seen: string[] = []
    stage.subscribe((_s, changed) => seen.push(changed.join(',')))
    site.deliver({ dzj: 'stage', v: PROTOCOL, type: 'update', patch: { has_more: true } }, { source: {} })
    site.deliver({ dzj: 'stage', v: PROTOCOL, type: 'update', patch: { has_more: true } }, { origin: 'https://evil.test' })
    site.deliver({ type: 'update', patch: { has_more: true } })
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    site.deliver({ dzj: 'stage', v: PROTOCOL + 1, type: 'update', patch: { has_more: true } })
    expect(err).toHaveBeenCalled()
    expect(seen).toEqual([])
    expect(stage.snapshot()?.has_more).toBe(false)
  })
})

describe('快照', () => {
  it('update 只给变了的几项：合进镜像，告诉订阅方变了哪些；空的不通知', async () => {
    const { site, stage } = await connected()
    const fn = vi.fn()
    const off = stage.subscribe(fn)
    site.update({ live: { said: '你好', text: '<正文>她', reasoning: '' } })
    expect(fn).toHaveBeenLastCalledWith(expect.objectContaining({ live: { said: '你好', text: '<正文>她', reasoning: '' }, card: expect.objectContaining({ id: 'c1', name: '卡' }) }), ['live'])
    site.update({})
    expect(fn).toHaveBeenCalledTimes(1)
    off()
    site.update({ has_more: true })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('换局 / 读档：网站再发一次 init，整份换掉', async () => {
    const { site, stage } = await connected()
    const fn = vi.fn()
    stage.subscribe(fn)
    site.init(snapOf({ card: { id: 'c2', name: '别的局', avatar: '', background: '', menu_background: '' } }))
    expect(stage.snapshot()?.card.id).toBe('c2')
    expect(fn.mock.calls[0][1]).toContain('history')
  })

  it('订阅方自己抛错：只打日志，不影响别的订阅方', async () => {
    const { site, stage } = await connected()
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ok = vi.fn()
    stage.subscribe(() => {
      throw new Error('坏')
    })
    stage.subscribe(ok)
    site.update({ has_more: true })
    expect(ok).toHaveBeenCalled()
    expect(err).toHaveBeenCalled()
  })
})

describe('请求', () => {
  it('send / stop / regenerate / older / gallery：发 request，网站回 ok 就 resolve', async () => {
    const { site, stage } = await connected()
    const cases: [() => Promise<unknown>, string, unknown][] = [
      [() => stage.send('你好'), 'send', { text: '你好' }],
      [() => stage.stop(), 'stop', undefined],
      [() => stage.regenerate(), 'regenerate', undefined],
      [() => stage.older(), 'older', undefined],
    ]
    for (const [call, method, args] of cases) {
      const p = call()
      const r = site.lastRequest()
      expect(r).toMatchObject({ method, args })
      site.reply(r.id!)
      await expect(p).resolves.toBeUndefined()
    }
    const g = stage.gallery()
    site.reply(site.lastRequest().id!, { turns: 3, previews: [], packs: [] })
    await expect(g).resolves.toEqual({ turns: 3, previews: [], packs: [] })
  })

  it('speak（0.4.0）：带 who / text / emotion，回音频地址；没配声音＝no_voice、不可重试', async () => {
    const { site, stage } = await connected()
    const p = stage.speak({ who: '妈妈', text: '跟你说了多少遍' })
    const r = site.lastRequest()
    expect(r).toMatchObject({ method: 'speak', args: { who: '妈妈', text: '跟你说了多少遍', emotion: '' } })
    site.reply(r.id!, { url: 'https://r2.test/a.mp3', cost: 20, cached: false })
    await expect(p).resolves.toEqual({ url: 'https://r2.test/a.mp3', cost: 20, cached: false })

    const q = stage.speak({ who: '路人', text: '嗯', emotion: '冷淡' })
    site.refuse(site.lastRequest().id!, 'no_voice', '这个角色没配声音')
    const e = await q.catch((x: StageError) => x)
    expect(e).toMatchObject({ code: 'no_voice' })
    expect((e as StageError).retryable).toBe(false)
  })

  it('网站拒了：抛 StageError（code / 中文原因），同时广播一次 error', async () => {
    const { site, stage } = await connected()
    const events: StageEvent[] = []
    stage.on((e) => events.push(e))
    const p = stage.send('你好')
    site.refuse(site.lastRequest().id!, 'insufficient', '能量不够')
    await expect(p).rejects.toMatchObject({ code: 'insufficient', message: '能量不够' })
    expect(events[0]).toMatchObject({ type: 'error', op: 'send', error: { code: 'insufficient' } })
    expect((events[0] as { error: StageError }).error.retryable).toBe(false)
  })

  it('网站 15 秒没回：network（能再试）', async () => {
    vi.useFakeTimers()
    const { stage } = await connected()
    const p = stage.stop()
    const fail = expect(p).rejects.toMatchObject({ code: 'network' })
    await vi.advanceTimersByTimeAsync(15_100)
    await fail
  })

  it('还没连上就请求：unauthorized，不发消息', async () => {
    const site = fakeSite()
    const stage = createStage({ parent: site.parent, self: site.self })
    stage.on(() => {})
    await expect(stage.send('你好')).rejects.toMatchObject({ code: 'unauthorized' })
    expect(site.requests()).toEqual([])
  })

  it('存档：存好了广播 save（带上是谁存的）', async () => {
    const { site, stage } = await connected()
    const events: StageEvent[] = []
    stage.on((e) => events.push(e))
    const p = stage.save({ hp: 3 }, { source: 'panel' })
    expect(site.lastRequest()).toMatchObject({ method: 'save', args: { state: { hp: 3 } } })
    site.reply(site.lastRequest().id!, { size: 8 })
    await expect(p).resolves.toEqual({ size: 8 })
    expect(events).toEqual([{ type: 'save', state: { hp: 3 }, source: 'panel' }])
  })

  it('dispose：还没回的请求失败，之后的消息不再理', async () => {
    const { site, stage } = await connected()
    const p = stage.stop()
    stage.dispose()
    await expect(p).rejects.toMatchObject({ code: 'network' })
    const fn = vi.fn()
    stage.subscribe(fn)
    site.update({ has_more: true })
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('打开网站工具 open / 网站地址 siteUrl', () => {
  it('连上之后：发 open 请求，返回 true；不认识的工具名不发', async () => {
    const { site, stage } = await connected()
    expect(stage.open('model')).toBe(true)
    expect(site.lastRequest()).toMatchObject({ method: 'open', args: { tool: 'model' } })
    const n = site.requests().length
    expect(stage.open('wallet' as never)).toBe(false)
    expect(site.requests().length).toBe(n)
  })

  it('还没连上：false', () => {
    const site = fakeSite()
    expect(createStage({ parent: site.parent, self: site.self }).open('mod')).toBe(false)
  })

  it('siteUrl：连上前只给路径，连上后拼网站地址', async () => {
    const site = fakeSite()
    const stage = createStage({ parent: site.parent, self: site.self })
    expect(stage.siteUrl('recharge')).toBe('/recharge')
    const p = stage.ready()
    site.init(snapOf())
    await p
    expect(stage.siteUrl('/recharge')).toBe(`${SITE}/recharge`)
  })
})

describe('report', () => {
  it('SDK 之外的失败也走同一条广播', async () => {
    const { stage } = await connected()
    const fn = vi.fn()
    stage.on(fn)
    stage.report('turn', new StageError('error', '规则出错'))
    expect(fn).toHaveBeenCalledWith({ type: 'error', op: 'turn', error: expect.any(StageError) })
  })
})
