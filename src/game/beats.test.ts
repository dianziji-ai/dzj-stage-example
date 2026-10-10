import { describe, expect, it } from 'vitest'
import { readZones, type StageSnapshot } from '@dianziji/stage'
import fx from './__fixtures__/card.json'
import oldOpening from './__fixtures__/opening-old.txt?raw'
import { isScript, keepGrowing, lastLook, lookAt, parseBeats, scriptRows, turnBeats, zoneBlock, type Beat } from './beats'

// 这张卡真实的分区定义 + 开场原文（从卡数据抄出来的）；opening-old＝2026-10-10 改剧本式之前的开场（老格式：旁白区散文 + 对话区）
const snap = { slots: fx.slots, image_pack: fx.image_pack } as unknown as Pick<StageSnapshot, 'slots' | 'image_pack'>
const opening = readZones(fx.opening, snap)
const herOf = (beats: Beat[]) => beats.filter((b): b is Extract<Beat, { kind: 'her' }> => b.kind === 'her')

describe('真实开场（剧本式）拆成一句一句', () => {
  const beats = turnBeats(fx.opening)
  it('照列表的顺序：旁白和台词交替，屏幕消息自成一句', () => {
    expect(beats.map((b) => b.kind)).toEqual(['narr', 'note', 'narr', 'her', 'her', 'narr', 'her', 'her'])
    expect(beats[1]).toEqual({ kind: 'note', source: '💻 电子姬 App', text: '检测到用户上线……正在传送，请勿关闭屏幕！' })
  })
  it('她的每一句自带样子（表情原文，不在这里认词）：惊讶 → 开心 → 害羞 → 调皮', () => {
    const her = herOf(beats)
    expect(her.map((b) => b.look.expr)).toEqual(['惊讶', '开心', '害羞', '调皮'])
    expect(her[0].text).toBe('（低头看看自己的手，又抬头看看你）「欸？欸欸？！真、真的出来了？！」')
  })
  it('平台也能把正文区读成列表（对话皮肤 [[#each narrative]] 靠它）', () => {
    expect(Array.isArray(opening.narrative?.value)).toBe(true)
    expect(opening.narrative?.value).toHaveLength(8)
  })
  it('心声单独取出来（飘在立绘旁）', () => {
    expect(String(opening.thought?.value ?? '').trim()).toBe('真、真的出来了……希望{{call}}别觉得我奇怪')
  })
})

describe('老消息（旁白区散文 + 对话区）照旧能读', () => {
  const beats = turnBeats(oldOpening)
  it('先旁白、后对话；心声不成句', () => {
    expect(beats.map((b) => b.kind)).toEqual(['narr', 'narr', 'narr', 'narr', 'her', 'her', 'her', 'her'])
    expect(beats.some((b) => b.text.includes('💭'))).toBe(false)
  })
  it('对话区从原文拆（卡上对话区关了也能读）', () => {
    const her = herOf(beats)
    expect(her.map((b) => b.look.expr)).toEqual(['惊讶', '开心', '害羞', '调皮'])
    expect(her[0].text).toBe('（两手撑着显示器边框，低头看看自己的手，又抬头看看你）「欸？欸欸？！真、真的出来了？！」')
  })
  it('对话区没有「我」：把你说的那句补在最前面', () => {
    expect(turnBeats(oldOpening, '我回来了')[0]).toEqual({ kind: 'you', text: '我回来了' })
  })
})

describe('剧本式：从原文读', () => {
  const turn = (body: string, close = true) => `<scene>\n地点: home\n</scene>\n<narrative>\n${body}${close ? '\n</narrative>\n<thought>\n嘿嘿\n</thought>' : ''}`
  const rows = "- 谁: '旁白'\n  说: '门开了。'\n- 谁: '我'\n  说: '我回来了'\n- 谁: '电子姬'\n  表情: '开心'\n  说: '欢迎回来！'"
  it('「我」的条目＝你说的；玩家原话不再补进来（等待时对话框自己显示）', () => {
    expect(turnBeats(turn(rows), '我回来了<dj_state>好感: 20</dj_state>').map((b) => b.kind)).toEqual(['narr', 'you', 'her'])
    expect(turnBeats(turn("- 谁: '电子姬'\n  表情: '开心'\n  说: '欢迎回来！'"), '我回来了').map((b) => b.kind)).toEqual(['her'])
  })
  it('生成中：只给写完的条目（最后一条可能还在写）', () => {
    expect(turnBeats(turn(rows, false), '', true).map((b) => b.kind)).toEqual(['narr', 'you'])
    expect(turnBeats(turn(rows), '', true).map((b) => b.kind)).toEqual(['narr', 'you', 'her'])
  })
  it('容错：同一条写了两次同一个键，以后写的为准；值被换行打断不丢字', () => {
    expect(scriptRows("- 谁: '电子姬'\n  表情: '平常'\n  表情: '害羞'\n  说: '才没\n有呢'")).toEqual([{ 谁: '电子姬', 表情: '害羞', 说: '才没有呢' }])
  })
  it('同一个区分几段写：按顺序拼起来', () => {
    const c = "<narrative>\n- 谁: '旁白'\n  说: 'A'\n</narrative>\n<status>\n</status>\n<narrative>\n- 谁: '电子姬'\n  说: 'B'\n</narrative>"
    expect(zoneBlock(c, 'narrative')?.done).toBe(true)
    expect(turnBeats(c).map((b) => b.text)).toEqual(['A', '「B」'])
  })
  it('认格式：有「- 谁:」行才算剧本式', () => {
    expect(isScript("- 谁: '旁白'")).toBe(true)
    expect(isScript('她跑到窗边。')).toBe(false)
  })
  it('句子只增不减（解析抖一下少了，保持已显示的）', () => {
    const a: Beat[] = [{ kind: 'narr', text: '一' }, { kind: 'narr', text: '二' }]
    expect(keepGrowing(a.slice(0, 1), a)).toBe(a)
    expect(keepGrowing(a, a.slice(0, 1))).toBe(a)
  })
})

describe('老格式对话区的各种写法', () => {
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
