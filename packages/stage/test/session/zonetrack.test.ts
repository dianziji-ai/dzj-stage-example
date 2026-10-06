import { describe, expect, it } from 'vitest'
import { closedOf, isClosed, lastAiText, latestZones, pickZone, stabilize, turnProgress, writingZone, zoneKey } from '../../src/session/zonetrack'
import type { StageMessage, StageZone, StageZones } from '../../src/index'

const data = (value: unknown): StageZone => ({ label: '', type: 'data', value })
const text = (value: string): StageZone => ({ label: '', type: 'narrative', value })
const msg = (id: number, role: 'user' | 'assistant', content: string, status?: string): StageMessage => ({ id, role, kind: null, content, ...(status ? { status } : {}) })

/** 测试用的「解析」：一行一个「区: 值」 */
const read = (raw: string): StageZones => Object.fromEntries(raw.split('\n').filter(Boolean).map((l) => [l.split(':')[0], data(l.split(':')[1])]))

describe('zoneKey / stabilize：内容没变就沿用同一个对象', () => {
  it('指纹：类型 + 值；对象值按 JSON 比', () => {
    expect(zoneKey(undefined)).toBe('')
    expect(zoneKey(text('你好'))).toBe(zoneKey(text('你好')))
    expect(zoneKey(data({ a: 1 }))).toBe(zoneKey(data({ a: 1 })))
    expect(zoneKey(data({ a: 1 }))).not.toBe(zoneKey(data({ a: 2 })))
    expect(zoneKey(text('1'))).not.toBe(zoneKey(data('1'))) // 类型不同不算一样
  })
  it('没变的区沿用上一份的引用，变了的换新；上一份有、这一份没有的不留', () => {
    const prev = { face: data({ 表情: 'happy' }), narrative: text('她笑') }
    const next = stabilize({ face: data({ 表情: 'happy' }), narrative: text('她笑了') }, prev)
    expect(next.face).toBe(prev.face)
    expect(next.narrative).not.toBe(prev.narrative)
    expect(stabilize({}, prev)).toEqual({})
  })
})

describe('isClosed / closedOf：写完了没有', () => {
  it('出现结束标签才算写完；标签里的空白也认', () => {
    expect(isClosed('<face>\n表情: happy\n</face>', 'face')).toBe(true)
    expect(isClosed('<face>\n表情: hap', 'face')).toBe(false)
    expect(isClosed('< / face >', 'face')).toBe(true)
    expect(isClosed('</faces>', 'face')).toBe(false)
  })
  it('区名里的特殊字符不会当成正则', () => {
    expect(isClosed('</a.b>', 'a.b')).toBe(true)
    expect(isClosed('</axb>', 'a.b')).toBe(false)
  })
  it('每个出现过的区各自算', () => {
    expect(closedOf('<a>1</a><b>2', { a: data(1), b: data(2) })).toEqual({ a: true, b: false })
  })
})

describe('writingZone：AI 正在写哪个区', () => {
  const ids = ['scene', 'face', 'narrative', 'thought', 'action']
  it('还没开始 / 只有散文：null', () => {
    expect(writingZone('', ids)).toBeNull()
    expect(writingZone('一些散文', ids)).toBeNull()
  })
  it('打开了还没关：就是它', () => {
    expect(writingZone('<scene>\n地点: home', ids)).toBe('scene')
    expect(writingZone('<scene>\n</scene>\n<narrative>她说', ids)).toBe('narrative')
  })
  it('刚关上一个、下一个还没开：按卡里的顺序算下一个', () => {
    expect(writingZone('<narrative>正文</narrative>\n', ids)).toBe('thought')
    expect(writingZone('<face>\n</face>', ids)).toBe('narrative')
  })
  it('写完最后一个区：null', () => {
    expect(writingZone('<action>\n- 敲门\n</action>', ids)).toBeNull()
  })
  it('正文里别的尖括号（<b>）、没注册的标签不算', () => {
    expect(writingZone('<narrative>她说<b>不要</b>', ids)).toBe('narrative')
    expect(writingZone('<narrative>正文</narrative><foo>x</foo>', ids)).toBe('thought')
  })
  it('中文区名也认', () => {
    expect(writingZone('<正文>她', ['场景', '正文'])).toBe('正文')
  })
})

describe('latestZones / lastAiText：最近一次写过的值', () => {
  const history = [
    msg(1, 'assistant', 'face:normal\nscene:home'), // 开场
    msg(2, 'user', '去公园'),
    msg(3, 'assistant', 'face:happy'),
    msg(4, 'user', '再来'),
    msg(5, 'assistant', 'face:sad\nscene:park', 'error'), // 断流的半截：不算
    msg(6, 'assistant', '   '), // 空的失败：不算
  ]
  it('每个区取最近写过它的那条；断流 / 空的不算；玩家的话不算', () => {
    const z = latestZones(history, read)
    expect(z.face).toEqual(data('happy'))
    expect(z.scene).toEqual(data('home'))
  })
  it('内容没变的沿用上一份引用', () => {
    const prev = latestZones(history, read)
    const again = latestZones([...history, msg(7, 'user', 'hi')], read, prev)
    expect(again.face).toBe(prev.face)
  })
  it('最后一条写完的 AI 回复', () => {
    expect(lastAiText(history)).toBe('face:happy')
    expect(lastAiText([msg(1, 'user', 'x')])).toBe('')
  })
})

describe('pickZone：按取法拿区', () => {
  const held = { face: data('normal') }
  it('这一轮写了：给这一轮的', () => {
    const s = { zones: { face: data('happy') }, held, closed: { face: true }, busy: true }
    expect(pickZone(s, 'face')).toEqual(data('happy'))
  })
  it('这一轮还没写到：hold 给最近写过的，不 hold 给 undefined', () => {
    const s = { zones: {}, held, closed: {}, busy: true }
    expect(pickZone(s, 'face', { hold: true })).toBe(held.face)
    expect(pickZone(s, 'face')).toBeUndefined()
  })
  it('complete：写到一半不给（hold 时给最近写过的），写完了给；不在生成时直接给', () => {
    const half = { zones: { face: data('hap') }, held, closed: { face: false }, busy: true }
    expect(pickZone(half, 'face', { complete: true })).toBeUndefined()
    expect(pickZone(half, 'face', { complete: true, hold: true })).toBe(held.face)
    expect(pickZone(half, 'face')).toEqual(data('hap')) // 不要求写完：半截也给（正文就是这样一个字一个字出）
    expect(pickZone({ ...half, closed: { face: true } }, 'face', { complete: true })).toEqual(data('hap'))
    expect(pickZone({ ...half, busy: false }, 'face', { complete: true })).toEqual(data('hap'))
  })
})

describe('turnProgress：这一轮写到哪儿了（只看位置，不数写完了几个）', () => {
  const slots = [{ zone: 'face', label: '表情' }, { zone: 'narrative', label: '正文' }, { zone: 'off', enabled: false }, { zone: 'action' }]
  it('没在生成：null', () => {
    expect(turnProgress({ busy: false, closed: {}, writing: null }, slots)).toBeNull()
  })
  it('刚发出去还没写：0，没有区名', () => {
    expect(turnProgress({ busy: true, closed: {}, writing: null }, slots)).toEqual({ zone: null, label: '', ratio: 0 })
  })
  it('正在写第 2 个区（停用的不算）：1.5 / 3', () => {
    expect(turnProgress({ busy: true, closed: { face: true }, writing: 'narrative' }, slots)).toEqual({ zone: 'narrative', label: '正文', ratio: 1.5 / 3 })
  })
  it('AI 跳过了正文、直接写选项：进度直接跳到选项的位置，不卡住', () => {
    expect(turnProgress({ busy: true, closed: { face: true }, writing: 'action' }, slots)).toMatchObject({ label: 'action', ratio: 2.5 / 3 })
  })
  it('最后一个区写完：1；卡没分区：0 不报错', () => {
    expect(turnProgress({ busy: true, closed: { action: true }, writing: 'action' }, slots)?.ratio).toBe(1)
    expect(turnProgress({ busy: true, closed: {}, writing: null }, [])).toMatchObject({ ratio: 0 })
  })
})
