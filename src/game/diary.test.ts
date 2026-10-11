import { describe, expect, it } from 'vitest'
import { readZones, type StageMessage, type StageSnapshot } from '@dianziji/stage'
import fx from './__fixtures__/card.json'
import replies from './__fixtures__/replies.json'
import { diaryFrom, diaryPages, fileName, hasUnread, paragraphs } from './diary'

// 这张卡真实的分区定义 + 自测时模型写的真实回复（睡觉那一轮写了日志）
const snap = { slots: fx.slots, image_pack: null } as unknown as StageSnapshot
const read = (t: string) => readZones(t, snap)

const BODY = '今天人家从屏幕里出来了。主人带人家下楼去了商店街，霓虹灯亮得人家眼睛都花了。晚上主人叫人家去洗澡，人家不会拧热水，喊了一声好烫。洗完出来的时候，他还坐在灯下等着，没有先睡。'
const withDiary = (day: string, title: string, deleted = '') =>
  `<scene>\n第几天: '${day}'\n天气: '晴'\n</scene>\n<diary>\n第几天: '${day}'\n天气: '雨'\n标题: '${title}'\n正文: '${BODY}'\n心情: '开心'\n删掉的一行: '${deleted}'\n</diary>`
const noDiary = `<scene>\n第几天: '2'\n</scene>\n<narrative>\n- 谁: 旁白\n  说: 普通的一天。\n</narrative>`
const msg = (id: number, role: StageMessage['role'], content: string, status = 'ok') => ({ id, role, kind: 'text', content, status }) as unknown as StageMessage

describe('日志：从回复的日志区取一页', () => {
  it('模型真实写的那一页：六项都读得出来', () => {
    const p = diaryFrom(9, read(replies.diary))!
    expect(p.day).toBe('1')
    expect(p.weather).toBe('晴')
    expect(p.title).toBeTruthy()
    expect(p.body.length).toBeGreaterThan(100)
    expect(p.mood).toBeTruthy()
  })
  it('第几天去掉「第 / 天」；删掉的一行去掉引号；写「无」＝没有', () => {
    expect(diaryFrom(7, read(withDiary('第3天', '下雨', '「其实我很怕被删掉」')))).toMatchObject({ day: '3', weather: '雨', title: '下雨', body: BODY, mood: '开心', deleted: '其实我很怕被删掉' })
    expect(diaryFrom(7, read(withDiary('3', 'x', '无')))?.deleted).toBe('')
  })
  it('这一轮没写日志＝null（检定、冒犯那两轮都没写）', () => {
    expect(diaryFrom(1, read(noDiary))).toBeNull()
    expect(diaryFrom(1, read(replies.check))).toBeNull()
    expect(diaryFrom(1, read(replies.offend))).toBeNull()
  })
})

describe('日志：历史 → 一页页（正序）', () => {
  const history = [
    msg(1, 'assistant', noDiary),
    msg(2, 'user', '催她去洗澡睡觉'),
    msg(3, 'assistant', withDiary('1', '第一天')),
    msg(4, 'user', '<diary>玩家自己写的不算</diary>'),
    msg(5, 'assistant', withDiary('2', '断流的'), 'error'),
    msg(6, 'assistant', withDiary('2', '咖啡馆')),
  ]
  it('只取 AI 正式回复里写了的；断流的那条不算', () => {
    expect(diaryPages(history, read, new Map()).map((p) => [p.id, p.title])).toEqual([
      [3, '第一天'],
      [6, '咖啡馆'],
    ])
  })
  it('按消息 id 缓存：同一条不重复解析', () => {
    const cache = new Map()
    let n = 0
    const counting = (t: string) => (n++, read(t))
    diaryPages(history, counting, cache)
    const first = n
    diaryPages(history, counting, cache)
    expect(n).toBe(first)
  })
  it('回溯 / 重生掉那一轮＝那一页跟着没了；有没有新页按最新一页的 id 算', () => {
    const pages = diaryPages(history.slice(0, 3), read, new Map())
    expect(pages).toHaveLength(1)
    expect(hasUnread(pages, 0)).toBe(true)
    expect(hasUnread(pages, 3)).toBe(false)
    expect(hasUnread([], 0)).toBe(false)
  })
})

describe('日志：排版小工具', () => {
  it('正文按句读分成几段，不在句子中间断', () => {
    const long = BODY + BODY
    const ps = paragraphs(long)
    expect(ps.length).toBeGreaterThan(1)
    expect(ps.join('')).toBe(long)
    for (const p of ps.slice(0, -1)) expect(p).toMatch(/[。！？!?…」]$/)
  })
  it('文件名：log_day01.txt；第几天没写＝log.txt', () => {
    expect(fileName({ day: '1' })).toBe('log_day01.txt')
    expect(fileName({ day: '12' })).toBe('log_day12.txt')
    expect(fileName({ day: '' })).toBe('log.txt')
  })
})
