import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiTurns, createSession, saidBefore } from '../../src/session/session'
import { StageError, withState, type SaveSource, type StageClient, type StageEvent, type StageMessage, type StageSave, type StageSnapshot, type TurnHandlers } from '../../src/index'

/** 假的 stage：send / resume 记下 handlers 由测试推进；save 立刻成功并广播；load 给更早的历史 */
function fakeStage(older: StageMessage[] = []) {
  const subs = new Set<(e: StageEvent) => void>()
  const sent: { text: string; h: TurnHandlers }[] = []
  const saves: { body: StageSave | null; source?: SaveSource }[] = []
  let sendError: StageError | null = null
  const resumed: TurnHandlers[] = []
  const reports: { op: string; code: string }[] = []
  const stage = {
    send: async (text: string, h: TurnHandlers) => {
      if (sendError) throw sendError
      sent.push({ text, h })
      return { id: 't', finished: Promise.resolve(''), close: () => {} }
    },
    resume: (_s: unknown, h: TurnHandlers) => {
      resumed.push(h)
      return { id: 't', finished: Promise.resolve(''), close: () => {} }
    },
    save: async (body: StageSave | null, o?: { source?: SaveSource }) => {
      saves.push({ body, source: o?.source })
      subs.forEach((f) => f({ type: 'save', state: body, source: o?.source ?? 'app' }))
      return { ok: true, size: 1 }
    },
    load: async () => ({ history: older, has_more: false }),
    on: (fn: (e: StageEvent) => void) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    report: (op: string, error: StageError) => reports.push({ op, code: error.code }),
  } as unknown as StageClient
  return {
    stage,
    sent,
    saves,
    resumed,
    reports,
    failNextSend: (e: StageError) => (sendError = e),
    external: (state: StageSave) => subs.forEach((f) => f({ type: 'save', state, source: 'panel' })),
  }
}

const msg = (id: number, role: 'user' | 'assistant', content: string): StageMessage => ({ id, role, kind: null, content })
const snapOf = (p: Partial<StageSnapshot> = {}): StageSnapshot =>
  ({ card: { id: 'c', name: 'c' }, slots: [], state_schema: { type: 'object' }, image_pack: null, history: [msg(1, 'assistant', '开场')], has_more: false, save: { love: 20 }, streaming: null, ...p }) as StageSnapshot

type Save = { love: number }
/** 游戏规则：原文里写了「+N」就加好感 */
const onTurn = ({ raw, save }: { raw: string; save: Save }) => ({ love: save.love + Number(raw.match(/\+(\d+)/)?.[1] ?? 0) })
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

describe('createSession', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }))
  afterEach(() => vi.useRealTimers())

  it('发一句话：先显示、进入生成中；写完进历史、按规则结算并立刻存', async () => {
    const f = fakeStage()
    const s = createSession<Save>({ stage: f.stage, snapshot: snapOf(), onTurn })
    const text = withState('你好', { 好感: 20 })
    expect(await s.send(`  ${text}  `)).toBe(true)
    expect(s.getState()).toMatchObject({ busy: true, live: '', said: '你好' }) // said 去掉了状态，直接拿去显示
    expect(s.getState().history.at(-1)).toMatchObject({ role: 'user', content: text }) // 历史是原文（和库里一样）
    expect(f.sent[0].text).toBe(text) // 原样发，SDK 不加东西

    f.sent[0].h.onDelta!('好呀 +3', '好呀 +3')
    expect(s.getState().live).toBe('好呀 +3')
    f.sent[0].h.onDone!('好呀 +3')
    await flush()
    const st = s.getState()
    expect(st).toMatchObject({ busy: false, live: null, said: '', save: { love: 23 } })
    expect(st.history.at(-1)).toMatchObject({ role: 'assistant', content: '好呀 +3' })
    expect(st.lastTurn).toMatchObject({ prev: { love: 20 }, next: { love: 23 }, n: 1 })
    expect(f.saves.at(-1)).toEqual({ body: { love: 23 }, source: 'saver' })
    s.dispose()
  })

  it('游戏规则 onTurn 抛错：这一轮不卡、存档不变、广播 turn 错误，游戏照常玩', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const f = fakeStage()
    const s = createSession<Save>({
      stage: f.stage,
      snapshot: snapOf(),
      onTurn: () => {
        throw new Error('作者的 bug')
      },
    })
    await s.send('你好')
    f.sent[0].h.onDone!('好呀 +3')
    await flush()
    expect(s.getState()).toMatchObject({ busy: false, live: null, save: { love: 20 } })
    expect(s.getState().history.at(-1)).toMatchObject({ role: 'assistant', content: '好呀 +3' })
    expect(f.reports).toEqual([{ op: 'turn', code: 'error' }])
    expect(await s.send('再来')).toBe(true) // 还能接着玩
    s.dispose()
    err.mockRestore()
  })
  it('同一时间只有一轮；空话不发', async () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: snapOf() })
    expect(await s.send('   ')).toBe(false)
    await s.send('一')
    expect(await s.send('二')).toBe(false)
    expect(f.sent).toHaveLength(1)
    s.dispose()
  })

  it('发不出去：撤回那句、给错误；连接类错误能「再说一次」', async () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: snapOf() })
    f.failNextSend(new StageError('network', '网络连接失败'))
    expect(await s.send('你好')).toBe(false)
    expect(s.getState().history).toHaveLength(1)
    expect(s.getState().error).toMatchObject({ retry: '你好' })
    expect(s.getState().error?.error.code).toBe('network')
    f.failNextSend(new StageError('insufficient', '能量不足'))
    await s.send('再来')
    expect(s.getState().error?.retry).toBeUndefined() // 能量不足：再试没用
    s.dispose()
  })

  it('流中途失败：给错误 + 能再说一次；retry 原样再发', async () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: snapOf() })
    await s.send('你好')
    f.sent[0].h.onFail!(new StageError('stream', '上游出错'))
    expect(s.getState()).toMatchObject({ busy: false, live: null, error: { retry: '你好' } })
    await s.retry()
    expect(f.sent.map((x) => x.text)).toEqual(['你好', '你好'])
    expect(s.getState().error).toBeNull()
    s.dispose()
  })

  it('进来时不补结算：玩家走了之后才写完的那一轮，不算就不算（编辑 / 重新生成也不会被重复结算）', () => {
    const f = fakeStage()
    const calls = vi.fn(onTurn)
    const s = createSession<Save>({ stage: f.stage, snapshot: snapOf({ history: [msg(1, 'assistant', '开场'), msg(2, 'user', '去公园'), msg(3, 'assistant', '走吧 +5')] }), onTurn: calls })
    expect(calls).not.toHaveBeenCalled()
    expect(s.getState()).toMatchObject({ save: { love: 20 }, lastTurn: null })
    expect(f.saves).toHaveLength(0)
    s.dispose()
  })

  it('玩家在本局面板改了存档：会话换成新的（normalize 过）', () => {
    const f = fakeStage()
    const s = createSession<Save>({ stage: f.stage, snapshot: snapOf(), normalize: (raw) => ({ love: Math.min(100, Number((raw as Save | null)?.love ?? 0)) }) })
    f.external({ love: 999 })
    expect(s.getState().save).toEqual({ love: 100 })
    s.dispose()
  })

  it('setSave：本地立刻生效，存档器合并后发；卡没存档结构时只改本地', () => {
    const f = fakeStage()
    const s = createSession<Save>({ stage: f.stage, snapshot: snapOf() })
    s.setSave((x) => ({ love: x.love + 1 }))
    s.setSave((x) => ({ love: x.love + 1 }))
    expect(s.getState().save).toEqual({ love: 22 })
    expect(f.saves).toHaveLength(0)
    vi.advanceTimersByTime(800)
    expect(f.saves.map((x) => x.body)).toEqual([{ love: 22 }])
    s.dispose()

    const g = fakeStage()
    const t = createSession<Save>({ stage: g.stage, snapshot: snapOf({ state_schema: null, save: null }) })
    t.setSave({ love: 1 }, { now: true })
    expect(t.getState()).toMatchObject({ save: { love: 1 }, canSave: false })
    expect(g.saves).toHaveLength(0)
    t.dispose()
  })

  it('往前翻：拼在前面、去重；刷新前还在生成：start 接着收，只接一次', async () => {
    const f = fakeStage([msg(-99, 'user', '本地的'), msg(0, 'user', '更早'), msg(1, 'assistant', '开场')])
    const s = createSession({ stage: f.stage, snapshot: snapOf({ has_more: true, streaming: { turn_id: 't', stream_url: 'u' }, history: [msg(1, 'assistant', '开场'), msg(2, 'user', '你好<dj_state>\n好感: 1\n</dj_state>')] }) })
    expect(s.getState()).toMatchObject({ busy: true, said: '你好' })
    expect(await s.loadOlder()).toBe(true)
    expect(s.getState().history.map((m) => m.id)).toEqual([-99, 0, 1, 2])

    const stop = s.start()
    stop()
    s.start() // StrictMode：挂两次
    expect(f.resumed).toHaveLength(2)
    f.resumed[1].onDone!('好')
    s.start()
    expect(f.resumed).toHaveLength(2) // 收完了不再接
    s.dispose()
  })

  it('思维链：生成中跟着变，写完清空', async () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: snapOf() })
    await s.send('你好')
    f.sent[0].h.onReasoning!('她在想', '')
    expect(s.getState().reasoning).toBe('她在想')
    f.sent[0].h.onDone!('好')
    expect(s.getState().reasoning).toBe('')
    s.dispose()
  })

  it('没有能再说的：retry 什么都不发；dismissError 收起错误', async () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: snapOf() })
    expect(await s.retry()).toBe(false)
    f.failNextSend(new StageError('insufficient', '能量不够了'))
    await s.send('你好')
    expect(s.getState().error?.retry).toBeUndefined() // 能量不足再说一次也没用
    expect(await s.retry()).toBe(false)
    s.dismissError()
    expect(s.getState().error).toBeNull()
    s.dispose()
  })

  it('往前翻：没有更早的不请求；读失败返回 false、历史不动；连点只请求一次', async () => {
    const f = fakeStage([msg(0, 'user', '更早')])
    const load = vi.spyOn(f.stage, 'load')
    const none = createSession({ stage: f.stage, snapshot: snapOf({ has_more: false }) })
    expect(await none.loadOlder()).toBe(true)
    expect(load).not.toHaveBeenCalled()

    const s = createSession({ stage: f.stage, snapshot: snapOf({ has_more: true }) })
    load.mockRejectedValueOnce(new StageError('network', '断了'))
    expect(await s.loadOlder()).toBe(false)
    expect(s.getState().history.map((m) => m.id)).toEqual([1])

    const [a, b] = [s.loadOlder(), s.loadOlder()]
    expect(await a).toBe(true)
    expect(await b).toBe(true)
    expect(load).toHaveBeenCalledTimes(2) // 失败那次 + 连点里的一次
    expect(s.getState().history.map((m) => m.id)).toEqual([0, 1])
    none.dispose()
    s.dispose()
  })

  it('saveNow 交给存档器；readZones 用这张卡的分区解析', async () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: snapOf({ slots: [{ zone: 'narrative', kind: 'markdown' }] }) })
    s.setSave({ love: 30 })
    s.saveNow()
    await flush()
    expect(f.saves.map((x) => [x.body, x.source])).toEqual([[{ love: 30 }, 'manual']])
    expect(s.readZones('<narrative>\n你好\n</narrative>').narrative?.value).toBe('你好')
    s.dispose()
  })

  it('dispose：不再收别处的存档、不再通知订阅者', () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: snapOf() })
    const fn = vi.fn()
    s.subscribe(fn)
    s.dispose()
    f.external({ love: 99 })
    expect(s.getState().save).toEqual({ love: 20 })
    expect(fn).not.toHaveBeenCalled()
  })

  describe('分区追踪（按区订阅的底子）', () => {
    // 一张小卡：表情（yaml）+ 正文 + 选项，用真实的分区解析
    const slots = [{ zone: 'face', kind: 'yaml' }, { zone: 'narrative', kind: 'markdown' }, { zone: 'action' }]
    const opening = '<face>\n表情: normal\n</face>\n<narrative>\n她从屏幕里钻出来。\n</narrative>'
    const snapZ = (p: Partial<StageSnapshot> = {}) => snapOf({ slots, history: [{ ...msg(1, 'assistant', opening), kind: 'opening' }], ...p } as Partial<StageSnapshot>)

    it('进来：这一轮的分区＝最后一条 AI 回复；最近写过的值也有', () => {
      const s = createSession({ stage: fakeStage().stage, snapshot: snapZ() })
      const st = s.getState()
      expect(st.zones.face).toMatchObject({ type: 'data', value: { 表情: 'normal' } })
      expect(st.held.face).toMatchObject({ type: 'data', value: { 表情: 'normal' } })
      expect(st.held.narrative).toMatchObject({ type: 'narrative', value: expect.stringContaining('钻出来') })
      expect(st.writing).toBeNull()
      s.dispose()
    })

    it('生成中：同一帧来的几段字只解析一次；没变的区是同一个对象；写完 / 正在写哪个区都有', async () => {
      const f = fakeStage()
      const s = createSession({ stage: f.stage, snapshot: snapZ() })
      await s.send('你好')
      expect(s.getState()).toMatchObject({ zones: {}, closed: {}, writing: null }) // 新一轮：还没写
      const h = f.sent[0].h

      let notified = 0
      s.subscribe(() => notified++)
      h.onDelta!('<face>\n表情: hap', '')
      h.onDelta!('<face>\n表情: happy\n</face>\n<narrative>\n她', '')
      expect(s.getState().zones).toEqual({}) // 还没到下一帧：分区没解析
      vi.advanceTimersByTime(16)
      expect(notified).toBe(3) // 两次 live + 一次分区
      const face1 = s.getState().zones.face
      expect(face1).toMatchObject({ value: { 表情: 'happy' } })
      expect(s.getState().closed).toMatchObject({ face: true, narrative: false })
      expect(s.getState().writing).toBe('narrative')

      h.onDelta!('<face>\n表情: happy\n</face>\n<narrative>\n她笑了', '')
      vi.advanceTimersByTime(16)
      expect(s.getState().zones.face).toBe(face1) // 正文在变，表情没变：同一个对象（订阅表情的组件不重画）
      expect(s.getState().zones.narrative).toMatchObject({ value: expect.stringContaining('她笑了') })

      h.onDone!('<face>\n表情: happy\n</face>\n<narrative>\n她笑了。\n</narrative>\n<action>\n- 摸摸头\n</action>')
      const st = s.getState()
      expect(st).toMatchObject({ writing: null, closed: { face: true, narrative: true, action: true } }) // 写完：立刻定稿
      expect(st.zones.face).toBe(face1)
      expect(st.held.face).toMatchObject({ value: { 表情: 'happy' } }) // 最近写过的值跟着更新
      expect(st.zones.action).toMatchObject({ type: 'action', value: ['摸摸头'] })
      s.dispose()
    })

    it('流中途失败 / 发不出去：分区回到最后一条写完的 AI 回复', async () => {
      const f = fakeStage()
      const s = createSession({ stage: f.stage, snapshot: snapZ() })
      await s.send('你好')
      f.sent[0].h.onDelta!('<face>\n表情: sad\n</face>', '')
      vi.advanceTimersByTime(16)
      f.sent[0].h.onFail!(new StageError('stream', '上游出错'))
      expect(s.getState().zones.face).toMatchObject({ value: { 表情: 'normal' } })
      expect(s.getState().writing).toBeNull()

      f.failNextSend(new StageError('network', '断了'))
      await s.send('再来')
      expect(s.getState().zones.face).toMatchObject({ value: { 表情: 'normal' } })
      s.dispose()
    })

    it('流结束后，还没执行的那一帧不会把分区改回半截', async () => {
      const f = fakeStage()
      const s = createSession({ stage: f.stage, snapshot: snapZ() })
      await s.send('你好')
      f.sent[0].h.onDelta!('<face>\n表情: hap', '')
      f.sent[0].h.onDone!('<face>\n表情: happy\n</face>')
      vi.advanceTimersByTime(16)
      expect(s.getState().zones.face).toMatchObject({ value: { 表情: 'happy' } })
      s.dispose()
    })

    describe('回看（上一轮 / 下一轮）', () => {
      // 开场（表情 normal、正文 A）→ 玩家「摸摸头」→ AI（表情 happy、正文 B）→ 玩家「再来」→ AI（只写正文 C）
      const hist = (): StageMessage[] => [
        { ...msg(1, 'assistant', opening), kind: 'opening' },
        msg(2, 'user', withState('摸摸头', { 好感: 20 })),
        msg(3, 'assistant', '<face>\n表情: happy\n</face>\n<narrative>\n正文B\n</narrative>\n<action>\n- 抱抱\n</action>'),
        msg(4, 'user', '再来'),
        msg(5, 'assistant', '<narrative>\n正文C\n</narrative>'),
      ]
      const body = (s: { getState: () => { zones: Record<string, { value: unknown }> } }) => String(s.getState().zones.narrative?.value ?? '')

      it('上一轮 / 下一轮：分区和「最近写过的值」都换成那一轮的；到最新回到平时', async () => {
        const s = createSession<Save>({ stage: fakeStage().stage, snapshot: snapZ({ history: hist() }) })
        expect(body(s)).toContain('正文C')
        expect(s.getState().held.face).toMatchObject({ value: { 表情: 'happy' } })

        expect(await s.prevTurn()).toBe(true)
        expect(s.getState().view).toBe(3)
        expect(body(s)).toContain('正文B')
        expect(s.getState().zones.action).toMatchObject({ value: ['抱抱'] })
        expect(s.getState().closed).toMatchObject({ narrative: true, face: true })

        expect(await s.prevTurn()).toBe(true)
        expect(s.getState().view).toBe(1)
        expect(body(s)).toContain('钻出来')
        expect(s.getState().held.face).toMatchObject({ value: { 表情: 'normal' } }) // 截至开场：还没 happy
        expect(await s.prevTurn()).toBe(false) // 没有更早的

        expect(s.nextTurn()).toBe(true)
        expect(s.getState().view).toBe(3)
        expect(s.nextTurn()).toBe(true)
        expect(s.getState().view).toBeNull()
        expect(body(s)).toContain('正文C')
        expect(s.getState().held.face).toMatchObject({ value: { 表情: 'happy' } })
        expect(s.nextTurn()).toBe(false) // 已经是最新
        s.dispose()
      })

      it('只是看：存档不动；玩家一发话自动回到最新；生成中不能翻', async () => {
        const f = fakeStage()
        const s = createSession<Save>({ stage: f.stage, snapshot: snapZ({ history: hist() }), onTurn })
        await s.prevTurn()
        expect(s.getState().save).toEqual({ love: 20 })
        await s.send('你好')
        expect(s.getState()).toMatchObject({ view: null, busy: true })
        expect(await s.prevTurn()).toBe(false)
        expect(s.viewTurn(3)).toBe(false)
        s.dispose()
      })

      it('viewTurn：最新那条＝回到平时；不认识的 id 不动；null 回到最新', () => {
        const s = createSession<Save>({ stage: fakeStage().stage, snapshot: snapZ({ history: hist() }) })
        expect(s.viewTurn(5)).toBe(true)
        expect(s.getState().view).toBeNull()
        expect(s.viewTurn(2)).toBe(false) // 玩家的话不能回看
        expect(s.viewTurn(99)).toBe(false)
        expect(s.viewTurn(1)).toBe(true)
        expect(s.viewTurn(null)).toBe(true)
        expect(s.getState().view).toBeNull()
        expect(body(s)).toContain('正文C')
        s.dispose()
      })

      it('翻到已加载的最早一轮：自动往前加载再翻；回看中加载，最近写过的值按那一轮重算', async () => {
        const old = [msg(-10, 'assistant', '<face>\n表情: sleepy\n</face>\n<narrative>\n更早\n</narrative>'), msg(-9, 'user', '早')]
        const s = createSession<Save>({ stage: fakeStage(old).stage, snapshot: snapZ({ history: hist(), has_more: true }) })
        await s.prevTurn()
        await s.prevTurn()
        expect(s.getState().view).toBe(1)
        expect(await s.prevTurn()).toBe(true) // 已加载的最早一轮再往前：自动 loadOlder
        expect(s.getState().view).toBe(-10)
        expect(body(s)).toContain('更早')
        expect(s.getState().held.face).toMatchObject({ value: { 表情: 'sleepy' } })
        s.dispose()
      })

      it('aiTurns 不算断流的半截；saidBefore 去掉附带的状态、开场之前没有', () => {
        const h = [...hist(), { ...msg(6, 'assistant', '半截'), status: 'error' } as StageMessage]
        expect(aiTurns(h).map((m) => m.id)).toEqual([1, 3, 5])
        expect(saidBefore(h, 3)).toBe('摸摸头')
        expect(saidBefore(h, 1)).toBe('')
      })
    })

    it('往前翻：更早的历史里才有的区，最近写过的值补上', async () => {
      const old = msg(0, 'assistant', '<action>\n- 很久以前的选项\n</action>')
      const f = fakeStage([old])
      const s = createSession({ stage: f.stage, snapshot: snapZ({ has_more: true }) })
      expect(s.getState().held.action).toBeUndefined()
      await s.loadOlder()
      expect(s.getState().held.action).toMatchObject({ value: ['很久以前的选项'] })
      s.dispose()
    })
  })
})
