import { describe, expect, it } from 'vitest'
import { cleanLine, planLines, voiceOf } from '../src/plan'

const cast = [
  { names: ['柳月儿', '妈妈'], image: '', desc: '', voice: true },
  { names: ['管家'], image: '', desc: '', voice: false },
]
const opt = { maxLine: 80, maxTurn: 300 }

describe('cleanLine：只留说出口的话', () => {
  it('去掉【动作】（神态）*旁白*、表情符号、markdown', () => {
    expect(cleanLine('【放下锅铲】跟你说了多少遍（皱眉）！*她叹气* 😤 **快去**')).toBe('跟你说了多少遍！ 快去')
  })
})

describe('voiceOf：角色有没有声音', () => {
  it('名字或别名对上就看 voice；对不上＝没有；括注去掉再比', () => {
    expect(voiceOf('妈妈', cast)).toBe(true)
    expect(voiceOf('柳月儿（小声）', cast)).toBe(true)
    expect(voiceOf('管家', cast)).toBe(false)
    expect(voiceOf('路人', cast)).toBe(false)
    expect(voiceOf('', cast)).toBe(false)
  })
  it('角色名带宏：舞台判断不了，交给网站（null）', () => {
    expect(voiceOf('小雪', [{ names: ['{{char}}'], image: '', desc: '', voice: true }])).toBeNull()
  })
})

describe('planLines', () => {
  it('没声音 / 太短 / 太长都不念，带原因', () => {
    const p = planLines(
      [
        { who: '妈妈', text: '跟你说了多少遍，袜子别乱扔！', emotion: ' 嫌弃 ' },
        { who: '管家', text: '小姐，茶好了。' },
        { who: '妈妈', text: '嗯……' },
        { who: '妈妈', text: '啊'.repeat(81) },
      ],
      cast,
      opt,
    )
    expect(p[0]).toMatchObject({ ok: true, who: '妈妈', emotion: '嫌弃' })
    expect(p.slice(1).map((x) => (x.ok ? 'ok' : x.reason))).toEqual(['no_voice', 'empty', 'too_long'])
  })
  it('生成中最后一句先不念（可能只写了半截）；写完就念', () => {
    const lines = [{ who: '妈妈', text: '第一句写完了。' }, { who: '妈妈', text: '第二句还在' }]
    expect(planLines(lines, cast, { ...opt, streaming: true }).map((x) => x.ok)).toEqual([true, false])
    expect(planLines(lines, cast, { ...opt, streaming: true })[1]).toEqual({ ok: false, reason: 'unfinished' })
    expect(planLines(lines, cast, opt).map((x) => x.ok)).toEqual([true, true])
  })
  it('本轮累计超额：那句和之后的都不念；0＝不限', () => {
    const ten = { who: '妈妈', text: '一二三四五六七八九十' }
    const p = planLines([ten, ten, ten, { who: '妈妈', text: '短的也不念' }], cast, { maxLine: 80, maxTurn: 25 })
    expect(p.map((x) => (x.ok ? 'ok' : x.reason))).toEqual(['ok', 'ok', 'turn_cap', 'turn_cap'])
    expect(planLines([ten, ten, ten], cast, { maxLine: 80, maxTurn: 0 }).every((x) => x.ok)).toBe(true)
  })
})
