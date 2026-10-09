/**
 * 这一轮哪些句子念、哪些不念（纯函数，不碰网络 / 音频）。
 *
 * 一句要念，得同时满足：
 *   ① 写完了：生成中（streaming）最后一句可能只写了半截，等后面出现新的一句或这一轮写完再说；
 *   ② 有声音：who 对得上角色包里配了声音的角色（名字或别名）；角色名里带 {{宏}} 的卡舞台对不上，交给网站判断；
 *   ③ 字数合适：清洗后（去掉【动作】（神态）*旁白*、表情符号、markdown）够 minChars、不超过 maxLine；
 *   ④ 本轮没超额：从第一句往后累计要念的字数，超过 maxTurn（0＝不限）的那句和之后的都不念。
 * 不念的带原因（reason），舞台想显示就显示；不念的句子不发请求、不扣钱。
 */
import { countChars } from '@dianziji/stage-settings'
import type { StageCharacter } from '@dianziji/stage'

export type VoiceLine = { who: string; text: string; emotion?: string }

export type SkipReason = 'unfinished' | 'no_voice' | 'empty' | 'too_long' | 'turn_cap'

export type PlannedLine =
  | { ok: true; who: string; text: string; emotion: string; chars: number }
  | { ok: false; reason: SkipReason }

export type PlanOptions = { maxLine: number; maxTurn: number; minChars?: number; streaming?: boolean }

/** 只留真正说出口的话 */
export function cleanLine(text: string): string {
  return text
    .replace(/【[^】]*】/g, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/\*[^*]*\*/g, '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[#>`_~|[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 角色名（去掉括注、空白）→ 能不能配音：true 有声音 / false 没有 / null 舞台判断不了（名字带宏，交给网站） */
export function voiceOf(who: string, characters: readonly StageCharacter[]): boolean | null {
  const name = who.replace(/[（(][^）)]*[）)]/g, '').trim()
  if (!name) return false
  let hasMacro = false
  for (const c of characters) {
    for (const n of c.names) {
      if (n.includes('{{')) hasMacro = true
      else if (n.trim() === name) return c.voice
    }
  }
  return hasMacro ? null : false
}

export function planLines(lines: readonly VoiceLine[], characters: readonly StageCharacter[], o: PlanOptions): PlannedLine[] {
  const min = o.minChars ?? 2
  let used = 0
  let capped = false
  return lines.map((l, i) => {
    if (o.streaming && i === lines.length - 1) return { ok: false, reason: 'unfinished' }
    if (voiceOf(l.who ?? '', characters) === false) return { ok: false, reason: 'no_voice' }
    const text = cleanLine(l.text ?? '')
    const chars = countChars(text)
    if (chars < min) return { ok: false, reason: 'empty' }
    if (chars > o.maxLine) return { ok: false, reason: 'too_long' }
    if (capped || (o.maxTurn > 0 && used + chars > o.maxTurn)) {
      capped = true
      return { ok: false, reason: 'turn_cap' }
    }
    used += chars
    return { ok: true, who: l.who.trim(), text, emotion: (l.emotion ?? '').trim(), chars }
  })
}
