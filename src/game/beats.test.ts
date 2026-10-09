import { describe, expect, it } from 'vitest'
import { readZones, zoneText, type StageSnapshot } from '@dianziji/stage'
import fx from './__fixtures__/card.json'
import { lastExpr, parseBeats, spriteAt, thoughtsOf, type Beat } from './beats'
import { exprOf } from './expression'

// 这张卡真实的分区定义 + 开场原文（从卡数据抄出来的）
const snap = { slots: fx.slots, image_pack: fx.image_pack } as unknown as Pick<StageSnapshot, 'slots' | 'image_pack'>
const opening = readZones(fx.opening, snap)
const narrative = zoneText(opening, 'narrative')
const talk = opening.talk?.value

describe('表情 → 立绘（exprOf）', () => {
  it('词表里的中文名、老格式的英文 id 直接对上', () => {
    expect(['平常', '开心', '害羞', '生气', '惊讶', '委屈', '调皮', '心动'].map(exprOf)).toEqual(['normal', 'happy', 'shy', 'pout', 'surprised', 'sad', 'wink', 'love'])
    expect(exprOf('surprised')).toBe('surprised')
  })
  it('模型没按词表写：按意思就近认回来', () => {
    expect(exprOf('脸红')).toBe('shy')
    expect(exprOf('吃醋')).toBe('pout')
    expect(exprOf('有点委屈')).toBe('sad')
    expect(exprOf('坏笑')).toBe('wink')
    expect(exprOf('温柔')).toBe('normal')
  })
  it('「不开心」不能被认成开心（否定的排在前面）', () => {
    expect(exprOf('不开心')).toBe('sad')
  })
  it('空的、认不出的＝null（画面沿用上一句）', () => {
    expect(exprOf('')).toBeNull()
    expect(exprOf(undefined)).toBeNull()
    expect(exprOf('嗯')).toBeNull()
  })
})

describe('真实开场拆成一句一句', () => {
  const beats = parseBeats(narrative, talk)
  it('先旁白、后对话；心声不成句', () => {
    expect(beats.map((b) => b.kind)).toEqual(['narr', 'narr', 'narr', 'narr', 'her', 'her', 'her', 'her'])
    expect(beats.some((b) => b.text.includes('💭'))).toBe(false)
  })
  it('她的每一句自带表情：惊讶 → 开心 → 害羞 → 调皮', () => {
    const her = beats.filter((b): b is Extract<Beat, { kind: 'her' }> => b.kind === 'her')
    expect(her.map((b) => b.expr)).toEqual(['surprised', 'happy', 'shy', 'wink'])
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
    expect(b[1]).toMatchObject({ kind: 'her', expr: 'happy' })
  })
  it('只有动作没说话：不带「」，也成一句；动作和台词都空的跳过', () => {
    const b = parseBeats('', [{ 表情: '害羞', 动作: '把脸埋进小鸡帽子里' }, { 表情: '平常' }])
    expect(b).toEqual([{ kind: 'her', text: '（把脸埋进小鸡帽子里）', say: false, expr: 'shy' }])
  })
  it('屏幕消息：首行粗体是来源，后面几行合成一句；--- 转场不成句', () => {
    const b = parseBeats('> **💻 电子姬 App**\n> 今晚有流星雨哦\n---\n她跑到窗边。')
    expect(b).toEqual([{ kind: 'note', source: '💻 电子姬 App', text: '今晚有流星雨哦' }, { kind: 'narr', text: '她跑到窗边。' }])
  })
  it('值不是数组（还在生成、或模型写坏了）不报错', () => {
    expect(parseBeats('旁白', 'oops')).toEqual([{ kind: 'narr', text: '旁白' }])
  })
})

describe('第几句显示哪张立绘（spriteAt）', () => {
  const beats: Beat[] = [
    { kind: 'narr', text: '旁白' },
    { kind: 'her', text: '「哼」', say: true, expr: 'pout' },
    { kind: 'you', text: '「对不起嘛」' },
    { kind: 'her', text: '「好啦」', say: true, expr: null },
    { kind: 'her', text: '「原谅你」', say: true, expr: 'happy' },
  ]
  it('一轮开头的旁白：提前换成她第一句的表情', () => expect(spriteAt(beats, 0, 'normal')).toBe('pout'))
  it('你说话时、她这句表情认不出时：沿用她上一句的', () => {
    expect(spriteAt(beats, 2, 'normal')).toBe('pout')
    expect(spriteAt(beats, 3, 'normal')).toBe('pout')
  })
  it('认得出就换', () => expect(spriteAt(beats, 4, 'normal')).toBe('happy'))
  it('这一轮她一句没说：用 fallback（上一轮最后的样子）', () => expect(spriteAt([{ kind: 'narr', text: '夜深了。' }], 0, 'shy')).toBe('shy'))
  it('lastExpr：这一轮她最后的表情', () => {
    expect(lastExpr(beats)).toBe('happy')
    expect(lastExpr([])).toBeNull()
  })
})
