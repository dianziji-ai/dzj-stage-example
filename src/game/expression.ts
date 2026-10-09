/**
 * 立绘怎么选：AI 在对话区每一句都写「表情」，这里把它认成 8 张立绘之一。
 *
 * ★为什么要「认」而不是直接拿来用：
 *   聊天内容千变万化，模型偶尔不按词表写——「脸红」「吃醋」「温柔地笑」「有点委屈」都可能出现。
 *   与其要求模型一字不差，不如舞台这边宽容一点：先看是不是词表里的词，再按意思就近归类，实在认不出才放弃。
 *   放弃也不出错：返回 null，画面沿用上一句的立绘（见 beats.ts 的 spriteAt），绝不会突然空掉。
 *
 * 三层，顺序很重要：
 *   ① 词表里的中文名（卡里写的「平常 / 开心 / 害羞 …」）或英文 id（老格式）→ 直接对上
 *   ② 近义词：按「最具体的先认」排，比如「不开心」必须排在「开心」前面，否则会被认成开心
 *   ③ 都不是 → null
 */
import type { ExprId } from './content'

/** 卡里写给模型的词表：中文名 → 立绘 id（对话区「表情」只许写这 8 个） */
export const EXPR_NAMES: Record<string, ExprId> = {
  平常: 'normal',
  开心: 'happy',
  害羞: 'shy',
  生气: 'pout',
  惊讶: 'surprised',
  委屈: 'sad',
  调皮: 'wink',
  心动: 'love',
}

const IDS = new Set<string>(Object.values(EXPR_NAMES))

/** 近义词 → 立绘。从上往下第一个命中的算数，所以「否定的 / 更具体的」放前面 */
const NEAR: [RegExp, ExprId][] = [
  [/不开心|不高兴|难过|伤心|委屈|想哭|哭|泪|失落|沮丧/, 'sad'],
  [/心动|喜欢|爱心|着迷|陶醉|怦然/, 'love'],
  [/害羞|羞|脸红|红了脸|不好意思|扭捏|紧张/, 'shy'],
  [/生气|气鼓|鼓腮|鼓起|吃醋|嫉妒|哼|不满|嫌弃|恼/, 'pout'],
  [/惊|吓|愣|呆|诧异|意外|慌/, 'surprised'],
  [/调皮|眨眼|吐舌|坏笑|狡黠|得意|恶作剧|捉弄/, 'wink'],
  [/开心|高兴|大笑|笑|兴奋|雀跃|欢|喜/, 'happy'],
  [/平常|平静|微笑|温柔|认真|思考|淡定|好奇/, 'normal'],
]

/**
 * 一句话的表情 → 立绘 id；认不出＝null（调用方沿用上一张）。
 *   exprOf('害羞') → 'shy' · exprOf('脸红') → 'shy' · exprOf('有点不开心') → 'sad' · exprOf('surprised') → 'surprised' · exprOf('') → null
 */
export function exprOf(word: unknown): ExprId | null {
  const w = typeof word === 'string' ? word.trim() : ''
  if (!w) return null
  if (w in EXPR_NAMES) return EXPR_NAMES[w]
  if (IDS.has(w)) return w as ExprId
  return NEAR.find(([re]) => re.test(w))?.[1] ?? null
}
