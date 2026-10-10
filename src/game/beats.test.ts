import { describe, expect, it } from 'vitest'
import { readZones, zoneRows, type StageSnapshot } from '@dianziji/stage'
import fx from './__fixtures__/card.json'
import { lastLook, lookAt, scriptBeats, type Beat } from './beats'

// 这张卡真实的分区定义 + 开场原文（从卡数据抄出来的）。列表由 SDK 拆（和网站聊天页同一套解析），这里只验「一条 → 一句」
const snap = { slots: fx.slots, image_pack: fx.image_pack } as unknown as Pick<StageSnapshot, 'slots' | 'image_pack'>
const opening = readZones(fx.opening, snap)
const beatsOf = (raw: string, closed = true) => scriptBeats(zoneRows(readZones(raw, snap), 'narrative', closed))
const herOf = (beats: Beat[]) => beats.filter((b): b is Extract<Beat, { kind: 'her' }> => b.kind === 'her')

describe('真实开场（剧本式）拆成一句一句', () => {
  const beats = scriptBeats(zoneRows(opening, 'narrative'))
  it('照列表的顺序：旁白和台词交替，屏幕消息自成一句', () => {
    expect(beats.map((b) => b.kind)).toEqual(['narr', 'note', 'narr', 'her', 'her', 'narr', 'her', 'her'])
    expect(beats[1]).toEqual({ kind: 'note', source: '💻 电子姬 App', text: '检测到用户上线……正在传送，请勿关闭屏幕！' })
  })
  it('她的每一句自带样子（表情原文，不在这里认词）：惊讶 → 开心 → 害羞 → 调皮', () => {
    const her = herOf(beats)
    expect(her.map((b) => b.look.expr)).toEqual(['惊讶', '开心', '害羞', '调皮'])
    expect(her[0].text).toBe('（低头看看自己的手，又抬头看看你）「欸？欸欸？！真、真的出来了？！」')
  })
  it('心声单独取出来（飘在立绘旁）', () => {
    expect(String(opening.thought?.value ?? '').trim()).toBe('真、真的出来了……希望{{call}}别觉得我奇怪')
  })
})

describe('剧本式的各种写法', () => {
  const turn = (body: string, close = true) => `<scene>\n地点: home\n</scene>\n<narrative>\n${body}${close ? '\n</narrative>\n<thought>\n嘿嘿\n</thought>' : ''}`
  const rows = "- 谁: '旁白'\n  说: '门开了。'\n- 谁: '我'\n  说: '我回来了'\n- 谁: '电子姬'\n  表情: '开心'\n  说: '欢迎回来！'"
  it('「我」的条目＝你说的；没有「我」就不补（等待时对话框自己显示玩家原话）', () => {
    expect(beatsOf(turn(rows)).map((b) => b.kind)).toEqual(['narr', 'you', 'her'])
    expect(beatsOf(turn("- 谁: '电子姬'\n  表情: '开心'\n  说: '欢迎回来！'")).map((b) => b.kind)).toEqual(['her'])
  })
  it('生成中（正文区还没写完）：只给写完的条目', () => {
    expect(beatsOf(turn(rows, false), false).map((b) => b.kind)).toEqual(['narr', 'you'])
  })
  it('「谁」写成玩家名字也算你；没写「谁」算她；模型自己加了「」只包一层', () => {
    const b = scriptBeats([{ 谁: '林川', 说: '早' }, { 表情: '开心', 说: '「早安！」' }])
    expect(b.map((x) => x.text)).toEqual(['「早」', '「早安！」'])
    expect(b[1]).toMatchObject({ kind: 'her', look: { expr: '开心' } })
  })
  it('只有动作没说话：不带「」，也成一句；动作和台词都空的跳过', () => {
    const b = scriptBeats([{ 谁: '电子姬', 表情: '害羞', 动作: '把脸埋进小鸡帽子里' }, { 谁: '电子姬', 表情: '平常' }])
    expect(b).toEqual([{ kind: 'her', text: '（把脸埋进小鸡帽子里）', say: false, look: { expr: '害羞', act: '把脸埋进小鸡帽子里', seed: '（把脸埋进小鸡帽子里）' } }])
  })
  it('旁白里的心声（💭）不成句；消息带来源', () => {
    const b = scriptBeats([{ 谁: '旁白', 说: '💭 好想他' }, { 谁: '消息', 来自: '💻 电子姬 App', 说: '今晚有流星雨哦' }])
    expect(b).toEqual([{ kind: 'note', source: '💻 电子姬 App', text: '今晚有流星雨哦' }])
  })
})

describe('第几句她是什么样子（lookAt）', () => {
  const L = (expr: string) => ({ expr, act: '', seed: expr })
  const beats: Beat[] = [
    { kind: 'narr', text: '旁白' },
    { kind: 'her', text: '「哼」', say: true, look: L('生气') },
    { kind: 'you', text: '「对不起嘛」' },
    { kind: 'her', text: '「原谅你」', say: true, look: L('开心') },
  ]
  const fallback = L('害羞')
  it('一轮开头的旁白：提前换成她第一句', () => expect(lookAt(beats, 0, fallback).expr).toBe('生气'))
  it('你说话时：沿用她上一句', () => expect(lookAt(beats, 2, fallback).expr).toBe('生气'))
  it('她说的那句就是那句', () => expect(lookAt(beats, 3, fallback).expr).toBe('开心'))
  it('这一轮她一句没说：用 fallback（上一轮最后的样子）', () => expect(lookAt([{ kind: 'narr', text: '夜深了。' }], 0, fallback)).toBe(fallback))
  it('lastLook：这一轮她最后的样子', () => {
    expect(lastLook(beats)?.expr).toBe('开心')
    expect(lastLook([])).toBeNull()
  })
})
