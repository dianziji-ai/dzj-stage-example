import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiTurns, createSession, saidBefore } from '../../src/session/session'
import { StageError, withState, type SaveSource, type SnapshotListener, type StageClient, type StageErrorCode, type StageEvent, type StageMessage, type StageSave, type StageSnapshot } from '../../src/index'

const msg = (id: number, role: 'user' | 'assistant', content: string): StageMessage => ({ id, role, kind: null, content })
const snapOf = (p: Partial<StageSnapshot> = {}): StageSnapshot => ({
  card: { id: 'c', name: 'c' },
  site: 'https://site.test',
  user: null,
  asset_base: '',
  slots: [],
  state_schema: { type: 'object' },
  image_pack: null,
  setup: { text: '', fields: [] },
  history: [msg(1, 'assistant', '开场')],
  has_more: false,
  save: { love: 20 },
  live: null,
  error: null,
  meta: { model: 'm', channel: 'c', dev: false },
  safe_area: { top: 0, right: 0, bottom: 0, left: 0 },
  ...p,
})

/**
 * 假的网站：舞台的请求记下来；push 模拟网站推快照。
 * turn / delta / done / fail＝网站那边一轮的四个时刻（谁发起的都一样）。older＝「更早的」那一页。
 */
function fakeStage(start: StageSnapshot = snapOf(), older: StageMessage[] = []) {
  let cur = start
  let id = 100
  const subs = new Set<SnapshotListener>()
  const evs = new Set<(e: StageEvent) => void>()
  const sent: string[] = []
  const saves: { body: StageSave | null; source?: SaveSource }[] = []
  const reports: { op: string; code: string }[] = []
  const calls: string[] = []
  let sendError: StageError | null = null
  let olderError: StageError | null = null
  const push = (patch: Partial<StageSnapshot>) => {
    cur = { ...cur, ...patch }
    subs.forEach((f) => f(cur, Object.keys(patch) as (keyof StageSnapshot)[]))
  }
  const stage = {
    snapshot: () => cur,
    subscribe: (fn: SnapshotListener) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    send: async (text: string) => {
      if (sendError) {
        const e = sendError
        sendError = null
        throw e
      }
      sent.push(text)
    },
    stop: async () => void calls.push('stop'),
    regenerate: async () => void calls.push('regenerate'),
    older: async () => {
      calls.push('older')
      if (olderError) {
        const e = olderError
        olderError = null
        throw e
      }
      const have = new Set(cur.history.map((m) => m.id))
      push({ history: [...older.filter((m) => !have.has(m.id)), ...cur.history], has_more: false })
    },
    save: async (body: StageSave | null, o?: { source?: SaveSource }) => {
      saves.push({ body, source: o?.source })
      evs.forEach((f) => f({ type: 'save', state: body, source: o?.source ?? 'app' }))
      return { size: 1 }
    },
    on: (fn: (e: StageEvent) => void) => {
      evs.add(fn)
      return () => evs.delete(fn)
    },
    report: (op: string, error: StageError) => reports.push({ op, code: error.code }),
  } as unknown as StageClient
  return {
    stage,
    sent,
    saves,
    reports,
    calls,
    get snap() {
      return cur
    },
    push,
    failNextSend: (e: StageError) => (sendError = e),
    failNextOlder: (e: StageError) => (olderError = e),
    external: (state: StageSave) => evs.forEach((f) => f({ type: 'save', state, source: 'panel' })),
    turn: (said: string, raw = said) => push({ history: [...cur.history, msg(++id, 'user', raw)], live: { said, text: '', reasoning: '' }, error: null }),
    delta: (text: string, reasoning = '') => push({ live: { ...cur.live!, text, reasoning } }),
    done: (text: string) => push({ live: null, history: [...cur.history, msg(++id, 'assistant', text)] }),
    fail: (code: StageErrorCode, message: string, retry?: string) => push({ live: null, error: { code, message, retry } }),
  }
}

type Save = { love: number }
/** 游戏规则：原文里写了「+N」就加好感 */
const onTurn = ({ raw, save }: { raw: string; save: Save }) => ({ love: save.love + Number(raw.match(/\+(\d+)/)?.[1] ?? 0) })
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

describe('createSession', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }))
  afterEach(() => vi.useRealTimers())

  it('发一句话：先显示、进入生成中；网站推来流式和写完的那条 → 进历史、按规则结算并立刻存', async () => {
    const f = fakeStage()
    const s = createSession<Save>({ stage: f.stage, snapshot: f.snap, onTurn })
    const text = withState('你好', { 好感: 20 })
    expect(await s.send(`  ${text}  `)).toBe(true)
    expect(s.getState()).toMatchObject({ busy: true, live: '', said: '你好' }) // said 去掉了状态，直接拿去显示
    expect(s.getState().history.at(-1)).toMatchObject({ role: 'user', content: text }) // 历史是原文（和库里一样）
    expect(f.sent[0]).toBe(text) // 原样发，SDK 不加东西

    f.turn('你好', text)
    f.delta('好呀 +3')
    expect(s.getState().live).toBe('好呀 +3')
    f.done('好呀 +3')
    await flush()
    const st = s.getState()
    expect(st).toMatchObject({ busy: false, live: null, said: '', save: { love: 23 } })
    expect(st.history.at(-1)).toMatchObject({ role: 'assistant', content: '好呀 +3' })
    expect(st.history.filter((m) => m.role === 'user')).toHaveLength(1) // 本地先插的那句被网站推来的换掉了，不重复
    expect(st.lastTurn).toMatchObject({ prev: { love: 20 }, next: { love: 23 }, n: 1 })
    expect(f.saves.at(-1)).toEqual({ body: { love: 23 }, source: 'saver' })
    s.dispose()
  })

  it('网站那边发起的一轮（网站输入框 / 快捷指令 / 重生）：一样显示生成中、流式、写完结算', async () => {
    const f = fakeStage()
    const s = createSession<Save>({ stage: f.stage, snapshot: f.snap, onTurn })
    f.turn('在网站输入框发的')
    expect(s.getState()).toMatchObject({ busy: true, live: '', said: '在网站输入框发的' })
    f.delta('<narrative>她</narrative>')
    expect(s.getState().live).toBe('<narrative>她</narrative>')
    f.done('好 +2')
    await flush()
    expect(s.getState()).toMatchObject({ busy: false, save: { love: 22 } })
    expect(f.sent).toEqual([]) // 舞台自己什么都没发
    s.dispose()
  })

  it('没在生成时网站换了历史（回溯 / 编辑 / 删除）：整份换掉、不结算；回看的那条没了就回到最新', () => {
    const calls = vi.fn(onTurn)
    const h = [msg(1, 'assistant', '开场'), msg(2, 'user', '一'), msg(3, 'assistant', '二 +5'), msg(4, 'user', '三'), msg(5, 'assistant', '四 +5')]
    const f = fakeStage(snapOf({ history: h }))
    const s = createSession<Save>({ stage: f.stage, snapshot: f.snap, onTurn: calls })
    expect(s.viewTurn(3)).toBe(true)
    f.push({ history: h.slice(0, 2) }) // 回溯到「一」：3 号没了
    expect(s.getState().history.map((m) => m.id)).toEqual([1, 2])
    expect(s.getState().view).toBeNull()
    expect(calls).not.toHaveBeenCalled()
    s.dispose()
  })

  it('游戏规则 onTurn 抛错：这一轮不卡、存档不变、广播 turn 错误，游戏照常玩', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const f = fakeStage()
    const s = createSession<Save>({
      stage: f.stage,
      snapshot: f.snap,
      onTurn: () => {
        throw new Error('作者的 bug')
      },
    })
    await s.send('你好')
    f.turn('你好')
    f.done('好呀 +3')
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
    const s = createSession({ stage: f.stage, snapshot: f.snap })
    expect(await s.send('   ')).toBe(false)
    await s.send('一')
    expect(await s.send('二')).toBe(false)
    expect(f.sent).toHaveLength(1)
    s.dispose()
  })

  it('网站没接受：撤回那句、给错误；连接类错误能「再说一次」', async () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: f.snap })
    f.failNextSend(new StageError('network', '网站没有回应'))
    expect(await s.send('你好')).toBe(false)
    expect(s.getState().history).toHaveLength(1)
    expect(s.getState()).toMatchObject({ busy: false, error: { retry: '你好' } })
    expect(s.getState().error?.error.code).toBe('network')
    f.failNextSend(new StageError('insufficient', '能量不足'))
    await s.send('再来')
    expect(s.getState().error?.retry).toBeUndefined() // 能量不足：再试没用
    s.dispose()
  })

  it('这一轮失败（网站推 error）：给错误 + 能再说一次；retry 原样再发；失败不结算', async () => {
    const calls = vi.fn(onTurn)
    const f = fakeStage()
    const s = createSession<Save>({ stage: f.stage, snapshot: f.snap, onTurn: calls })
    await s.send('你好')
    f.turn('你好')
    f.fail('stream', '上游出错')
    expect(s.getState()).toMatchObject({ busy: false, live: null, error: { retry: '你好' } })
    expect(calls).not.toHaveBeenCalled()
    await s.retry()
    expect(f.sent).toEqual(['你好', '你好'])
    expect(s.getState().error).toBeNull()
    s.dispose()
  })

  it('网站给了 retry 就用网站的（比如那一轮是在网站输入框发的）', () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: f.snap })
    f.turn('网站发的')
    f.fail('error', '上游出错', '网站发的')
    expect(s.getState().error?.retry).toBe('网站发的')
    s.dispose()
  })

  it('进来时不补结算：已经写完的历史一律不算', () => {
    const f = fakeStage(snapOf({ history: [msg(1, 'assistant', '开场'), msg(2, 'user', '去公园'), msg(3, 'assistant', '走吧 +5')] }))
    const calls = vi.fn(onTurn)
    const s = createSession<Save>({ stage: f.stage, snapshot: f.snap, onTurn: calls })
    expect(calls).not.toHaveBeenCalled()
    expect(s.getState()).toMatchObject({ save: { love: 20 }, lastTurn: null })
    expect(f.saves).toHaveLength(0)
    s.dispose()
  })

  it('进来时那一轮还在生成：接着显示，写完照常结算（只结算一次）', async () => {
    const f = fakeStage(snapOf({ history: [msg(1, 'assistant', '开场'), msg(2, 'user', '你好')], live: { said: '你好', text: '好', reasoning: '' } }))
    const calls = vi.fn(onTurn)
    const s = createSession<Save>({ stage: f.stage, snapshot: f.snap, onTurn: calls })
    expect(s.getState()).toMatchObject({ busy: true, said: '你好', live: '好' })
    f.done('好 +1')
    f.push({ history: [...f.snap.history] }) // 之后又推了一次同样的历史（比如临时 id 换正式 id）
    await flush()
    expect(calls).toHaveBeenCalledTimes(1)
    expect(s.getState().save).toEqual({ love: 21 })
    s.dispose()
  })

  it('玩家在本局面板改了存档：会话换成新的（normalize 过）', () => {
    const f = fakeStage()
    const s = createSession<Save>({ stage: f.stage, snapshot: f.snap, normalize: (raw) => ({ love: Math.min(100, Number((raw as Save | null)?.love ?? 0)) }) })
    f.external({ love: 999 })
    expect(s.getState().save).toEqual({ love: 100 })
    s.dispose()
  })

  it('setSave：本地立刻生效，存档器合并后发；卡没存档结构时只改本地', () => {
    const f = fakeStage()
    const s = createSession<Save>({ stage: f.stage, snapshot: f.snap })
    s.setSave((x) => ({ love: x.love + 1 }))
    s.setSave((x) => ({ love: x.love + 1 }))
    expect(s.getState().save).toEqual({ love: 22 })
    expect(f.saves).toHaveLength(0)
    vi.advanceTimersByTime(800)
    expect(f.saves.map((x) => x.body)).toEqual([{ love: 22 }])
    s.dispose()

    const g = fakeStage(snapOf({ state_schema: null, save: null }))
    const t = createSession<Save>({ stage: g.stage, snapshot: g.snap })
    t.setSave({ love: 1 }, { now: true })
    expect(t.getState()).toMatchObject({ save: { love: 1 }, canSave: false })
    expect(g.saves).toHaveLength(0)
    t.dispose()
  })

  it('思维链：生成中跟着变，写完清空', async () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: f.snap })
    await s.send('你好')
    f.turn('你好')
    f.delta('', '她在想')
    expect(s.getState().reasoning).toBe('她在想')
    f.done('好')
    expect(s.getState().reasoning).toBe('')
    s.dispose()
  })

  it('没有能再说的：retry 什么都不发；dismissError 收起错误', async () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: f.snap })
    expect(await s.retry()).toBe(false)
    f.failNextSend(new StageError('insufficient', '能量不够了'))
    await s.send('你好')
    expect(s.getState().error?.retry).toBeUndefined()
    expect(await s.retry()).toBe(false)
    s.dismissError()
    expect(s.getState().error).toBeNull()
    s.dispose()
  })

  it('往前翻：请网站读，读到的随快照推过来；没有更早的不请求；读失败返回 false；连点只请求一次', async () => {
    const none = fakeStage(snapOf({ has_more: false }))
    const a0 = createSession({ stage: none.stage, snapshot: none.snap })
    expect(await a0.loadOlder()).toBe(true)
    expect(none.calls).toEqual([])

    const f = fakeStage(snapOf({ has_more: true }), [msg(0, 'user', '更早')])
    const s = createSession({ stage: f.stage, snapshot: f.snap })
    f.failNextOlder(new StageError('network', '断了'))
    expect(await s.loadOlder()).toBe(false)
    expect(s.getState().history.map((m) => m.id)).toEqual([1])
    const [a, b] = [s.loadOlder(), s.loadOlder()]
    expect(await a).toBe(true)
    expect(await b).toBe(true)
    expect(f.calls.filter((c) => c === 'older')).toHaveLength(2) // 失败那次 + 连点里的一次
    expect(s.getState().history.map((m) => m.id)).toEqual([0, 1])
    expect(s.getState().hasOlder).toBe(false)
    a0.dispose()
    s.dispose()
  })

  it('停止 / 重生：交给网站；没在生成不停、生成中不重生、没有 AI 回复不重生', async () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: f.snap })
    expect(await s.stop()).toBe(false)
    expect(await s.regenerate()).toBe(true)
    f.turn('')
    expect(await s.regenerate()).toBe(false)
    expect(await s.stop()).toBe(true)
    expect(f.calls).toEqual(['regenerate', 'stop'])
    s.dispose()

    const g = fakeStage(snapOf({ history: [] }))
    const t = createSession({ stage: g.stage, snapshot: g.snap })
    expect(await t.regenerate()).toBe(false)
    t.dispose()
  })

  it('saveNow 交给存档器；readZones 用这张卡的分区解析', async () => {
    const f = fakeStage(snapOf({ slots: [{ zone: 'narrative', kind: 'markdown' }] } as Partial<StageSnapshot>))
    const s = createSession({ stage: f.stage, snapshot: f.snap })
    s.setSave({ love: 30 })
    s.saveNow()
    await flush()
    expect(f.saves.map((x) => [x.body, x.source])).toEqual([[{ love: 30 }, 'manual']])
    expect(s.readZones('<narrative>\n你好\n</narrative>').narrative?.value).toBe('你好')
    s.dispose()
  })

  it('dispose：不再收网站的快照和别处的存档、不再通知订阅者', () => {
    const f = fakeStage()
    const s = createSession({ stage: f.stage, snapshot: f.snap })
    const fn = vi.fn()
    s.subscribe(fn)
    s.dispose()
    f.external({ love: 99 })
    f.turn('你好')
    expect(s.getState()).toMatchObject({ save: { love: 20 }, busy: false })
    expect(fn).not.toHaveBeenCalled()
  })

  describe('分区追踪（按区订阅的底子）', () => {
    // 一张小卡：表情（yaml）+ 正文 + 选项，用真实的分区解析
    const slots = [{ zone: 'face', kind: 'yaml' }, { zone: 'narrative', kind: 'markdown' }, { zone: 'action' }]
    const opening = '<face>\n表情: normal\n</face>\n<narrative>\n她从屏幕里钻出来。\n</narrative>'
    const snapZ = (p: Partial<StageSnapshot> = {}) => snapOf({ slots, history: [{ ...msg(1, 'assistant', opening), kind: 'opening' }], ...p } as Partial<StageSnapshot>)

    it('进来：这一轮的分区＝最后一条 AI 回复；最近写过的值也有', () => {
      const s = createSession({ stage: fakeStage(snapZ()).stage, snapshot: snapZ() })
      const st = s.getState()
      expect(st.zones.face).toMatchObject({ type: 'data', value: { 表情: 'normal' } })
      expect(st.held.face).toMatchObject({ type: 'data', value: { 表情: 'normal' } })
      expect(st.held.narrative).toMatchObject({ type: 'narrative', value: expect.stringContaining('钻出来') })
      expect(st.writing).toBeNull()
      s.dispose()
    })

    it('生成中：同一帧来的几段字只解析一次；没变的区是同一个对象；写完 / 正在写哪个区都有', async () => {
      const f = fakeStage(snapZ())
      const s = createSession({ stage: f.stage, snapshot: f.snap })
      await s.send('你好')
      expect(s.getState()).toMatchObject({ zones: {}, closed: {}, writing: null }) // 新一轮：还没写
      f.turn('你好')

      let notified = 0
      s.subscribe(() => notified++)
      f.delta('<face>\n表情: hap')
      f.delta('<face>\n表情: happy\n</face>\n<narrative>\n她')
      expect(s.getState().zones).toEqual({}) // 还没到下一帧：分区没解析
      vi.advanceTimersByTime(16)
      expect(notified).toBe(3) // 两次 live + 一次分区
      const face1 = s.getState().zones.face
      expect(face1).toMatchObject({ value: { 表情: 'happy' } })
      expect(s.getState().closed).toMatchObject({ face: true, narrative: false })
      expect(s.getState().writing).toBe('narrative')

      f.delta('<face>\n表情: happy\n</face>\n<narrative>\n她笑了')
      vi.advanceTimersByTime(16)
      expect(s.getState().zones.face).toBe(face1) // 正文在变，表情没变：同一个对象（订阅表情的组件不重画）
      expect(s.getState().zones.narrative).toMatchObject({ value: expect.stringContaining('她笑了') })

      f.done('<face>\n表情: happy\n</face>\n<narrative>\n她笑了。\n</narrative>\n<action>\n- 摸摸头\n</action>')
      const st = s.getState()
      expect(st).toMatchObject({ writing: null, closed: { face: true, narrative: true, action: true } }) // 写完：立刻定稿
      expect(st.zones.face).toBe(face1)
      expect(st.held.face).toMatchObject({ value: { 表情: 'happy' } }) // 最近写过的值跟着更新
      expect(st.zones.action).toMatchObject({ type: 'action', value: ['摸摸头'] })
      s.dispose()
    })

    it('流中途失败 / 发不出去：分区回到最后一条写完的 AI 回复', async () => {
      const f = fakeStage(snapZ())
      const s = createSession({ stage: f.stage, snapshot: f.snap })
      await s.send('你好')
      f.turn('你好')
      f.delta('<face>\n表情: sad\n</face>')
      vi.advanceTimersByTime(16)
      f.fail('stream', '上游出错')
      expect(s.getState().zones.face).toMatchObject({ value: { 表情: 'normal' } })
      expect(s.getState().writing).toBeNull()

      f.failNextSend(new StageError('network', '断了'))
      await s.send('再来')
      expect(s.getState().zones.face).toMatchObject({ value: { 表情: 'normal' } })
      s.dispose()
    })

    it('流结束后，还没执行的那一帧不会把分区改回半截', async () => {
      const f = fakeStage(snapZ())
      const s = createSession({ stage: f.stage, snapshot: f.snap })
      await s.send('你好')
      f.turn('你好')
      f.delta('<face>\n表情: hap')
      f.done('<face>\n表情: happy\n</face>')
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
        const s = createSession<Save>({ stage: fakeStage(snapZ({ history: hist() })).stage, snapshot: snapZ({ history: hist() }) })
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
        const f = fakeStage(snapZ({ history: hist() }))
        const s = createSession<Save>({ stage: f.stage, snapshot: f.snap, onTurn })
        await s.prevTurn()
        expect(s.getState().save).toEqual({ love: 20 })
        await s.send('你好')
        expect(s.getState()).toMatchObject({ view: null, busy: true })
        expect(await s.prevTurn()).toBe(false)
        expect(s.viewTurn(3)).toBe(false)
        s.dispose()
      })

      it('viewTurn：最新那条＝回到平时；不认识的 id 不动；null 回到最新', () => {
        const s = createSession<Save>({ stage: fakeStage(snapZ({ history: hist() })).stage, snapshot: snapZ({ history: hist() }) })
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
        const s = createSession<Save>({ stage: fakeStage(snapZ({ history: hist(), has_more: true }), old).stage, snapshot: snapZ({ history: hist(), has_more: true }) })
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
      const f = fakeStage(snapZ({ has_more: true }), [old])
      const s = createSession({ stage: f.stage, snapshot: f.snap })
      expect(s.getState().held.action).toBeUndefined()
      await s.loadOlder()
      expect(s.getState().held.action).toMatchObject({ value: ['很久以前的选项'] })
      s.dispose()
    })
  })})
