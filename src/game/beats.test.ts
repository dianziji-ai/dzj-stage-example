import { describe, expect, it } from 'vitest'
import { readZones, zoneText, type StageSnapshot } from '@dianziji/stage'
import fx from './__fixtures__/card.json'
import { lastLook, lookAt, parseBeats, thoughtsOf, type Beat } from './beats'

// 这张卡真实的分区定义 + 开场原文（从卡数据抄出来的）
const snap = { slots: fx.slots, image_pack: fx.image_pack } as unknown as Pick<StageSnapshot, 'slots' | 'image_pack'>
const opening = readZones(fx.opening, snap)
const narrative = zoneText(opening, 'narrative')
const talk = opening.talk?.value

describe('真实开场拆成一句一句', () => {
  const beats = parseBeats(narrative, talk)
  it('先旁白、后对话；心声不成句', () => {
    expect(beats.map((b) => b.kind)).toEqual(['narr', 'narr', 'narr', 'narr', 'her', 'her', 'her', 'her'])
    expect(beats.some((b) => b.text.includes('💭'))).toBe(false)
  })
  it('她的每一句自带样子（表情原文，不在这里认词）：惊讶 → 开心 → 害羞 → 调皮', () => {
    const her = beats.filter((b): b is Extract<Beat, { kind: 'her' }> => b.kind === 'her')
    expect(her.map((b) => b.look.expr)).toEqual(['惊讶', '开心', '害羞', '调皮'])
    expect(her[0].look.act).toBe('两手撑着显示器边框，低头看看自己的手，又抬头看看你')
    expect(her[0].text).toBe('（两手撑着显示器边框，低头看看自己的手，又抬头看看你）「欸？欸欸？！真、真的出来了？！」')
  })
  it('心声单独取出来（飘在立绘旁）', () => {
    expect(thoughtsOf(narrative)).toEqual(['真、真的出来了……希望{{call}}别觉得我奇怪'])
  })
})

describe('对话区的各种写法', () => {
  it('「我」的条目＝你说的；有了就不再补你发出去的那句', () => {
    const b = parseBeats('门开了。', [
      { 谁: '我', 动作: '把伞递过去', 说: '一起走吧' },
      { 谁: '电子姬', 表情: '害羞', 说: '嗯……' },
    ], '一起走吧')
    expect(b.map((x) => [x.kind, x.text])).toEqual([['narr', '门开了。'], ['you', '（把伞递过去）「一起走吧」'], ['her', '「嗯……」']])
  })
  it('对话区里没有「我」：把你发出去的那句放最前面（去掉附给 AI 的状态块）', () => {
    const b = parseBeats('', [{ 谁: '电子姬', 表情: '开心', 说: '欢迎回来！' }], '我回来了<dj_state>好感: 20</dj_state>')
    expect(b[0]).toEqual({ kind: 'you', text: '我回来了' })
  })
  it('「谁」写成玩家名字也算你；没写「谁」算她；模型自己加了「」只包一层', () => {
    const b = parseBeats('', [{ 谁: '林川', 说: '早' }, { 表情: '开心', 说: '「早安！」' }])
    expect(b.map((x) => x.text)).toEqual(['「早」', '「早安！」'])
    expect(b[1]).toMatchObject({ kind: 'her', look: { expr: '开心' } })
  })
  it('只有动作没说话：不带「」，也成一句；动作和台词都空的跳过', () => {
    const b = parseBeats('', [{ 表情: '害羞', 动作: '把脸埋进小鸡帽子里' }, { 表情: '平常' }])
    expect(b).toEqual([{ kind: 'her', text: '（把脸埋进小鸡帽子里）', say: false, look: { expr: '害羞', act: '把脸埋进小鸡帽子里', seed: '（把脸埋进小鸡帽子里）' } }])
  })
  it('屏幕消息：首行粗体是来源，后面几行合成一句；--- 转场不成句', () => {
    const b = parseBeats('> **💻 电子姬 App**\n> 今晚有流星雨哦\n---\n她跑到窗边。')
    expect(b).toEqual([{ kind: 'note', source: '💻 电子姬 App', text: '今晚有流星雨哦' }, { kind: 'narr', text: '她跑到窗边。' }])
  })
  it('值不是数组（还在生成、或模型写坏了）不报错', () => {
    expect(parseBeats('旁白', 'oops')).toEqual([{ kind: 'narr', text: '旁白' }])
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
