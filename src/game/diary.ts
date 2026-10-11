import { zoneData, type StageMessage, type StageZones } from '@dianziji/stage'

/*
 * 电子姬的日志 log.txt（照《妈妈柳月儿》的日记本搬过来）：卡上「日志」分区（diary）是正文里的一个内容区，
 * AI 只在她这一天结束（催她睡觉 / 说晚安 / 她睡着）时写一页，平时整个区不出现。
 * 舞台不存档：打开日志时把历史里每条 AI 回复的日志区一页页取出来——
 * 回溯 / 重生掉的那一轮，那一页跟着没了，日志永远和剧情对得上；更早的页靠 loadOlder 往前翻。
 */

export type DiaryPage = {
  /** 写下这一页的那条 AI 回复的 id（翻页 / 未读都认它） */
  id: number
  day: string
  weather: string
  title: string
  body: string
  mood: string
  /** 她打出来又按退格删掉的一句真心话（没有＝''） */
  deleted: string
}

const s = (d: Record<string, unknown>, k: string) => {
  const v = d[k]
  return (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').trim()
}

/** 一条回复的日志区 → 一页；没写日志（或正文是空的）＝null */
export function diaryFrom(id: number, zones: StageZones): DiaryPage | null {
  const d = zoneData(zones, 'diary')
  const body = s(d, '正文')
  if (!body) return null
  const deleted = s(d, '删掉的一行').replace(/^[「『"']+|[」』"']+$/g, '')
  return {
    id,
    day: s(d, '第几天').replace(/^第\s*|\s*天$/g, ''),
    weather: s(d, '天气'),
    title: s(d, '标题'),
    body,
    mood: s(d, '心情'),
    deleted: deleted === '无' ? '' : deleted,
  }
}

/**
 * 历史 → 日志页（正序）。只看 AI 的正式回复；cache 按消息 id 记住解析结果（历史每轮只多几条，别每次全量重解析）。
 * read＝把一条回复原文解析成分区（useStageActions().readZones）。
 */
export function diaryPages(history: StageMessage[], read: (text: string) => StageZones, cache: Map<number, DiaryPage | null>): DiaryPage[] {
  const out: DiaryPage[] = []
  for (const m of history) {
    if (m.role !== 'assistant' || m.status === 'error' || !m.content.includes('diary')) continue
    let page = cache.get(m.id)
    if (page === undefined) {
      page = diaryFrom(m.id, read(m.content))
      cache.set(m.id, page)
    }
    if (page) out.push(page)
  }
  return out
}

/** 正文分段：模型被要求写一行，这里按句读成几段（每段大约 90 字，只在句号 / 问号 / 叹号 / 省略号后断） */
export function paragraphs(body: string, size = 90): string[] {
  const sentences = body.match(/[^。！？!?…]+(?:[。！？!?]+|…+)?[」』”]?/g) ?? [body]
  const out: string[] = []
  let cur = ''
  for (const x of sentences) {
    cur += x
    if (cur.length >= size) {
      out.push(cur.trim())
      cur = ''
    }
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

/** 日志文件名：log_day01.txt（第几天没写＝log.txt） */
export const fileName = (p: Pick<DiaryPage, 'day'>) => (/^\d+$/.test(p.day) ? `log_day${p.day.padStart(2, '0')}.txt` : 'log.txt')

/** 有没有没看过的新页：最新一页的 id 比本机记的「看到哪了」大 */
export const hasUnread = (pages: DiaryPage[], seenId: number) => (pages.at(-1)?.id ?? 0) > seenId
