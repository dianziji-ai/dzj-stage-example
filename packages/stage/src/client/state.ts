/** 平台约定的 <dj_state> 状态块：拼进玩家的话 / 从历史里拆回来 */

/**
 * 把「此刻状态」附在玩家这句话末尾，用平台约定的 <dj_state>…</dj_state> 包起来（要不要附、附什么，舞台自己决定）。
 * 平台认得这个标签：发给 AI 时历史里的旧状态整块删掉、只留最新一份并去掉标签（不会越聊越长）；
 * 网站聊天页、记忆摘要、聊天搜索都会把它藏掉。里面放什么都行（数值、背包、任务、一句话说明…），每次带一份完整的。
 * 去掉标签后的内容照常参与世界书扫描（标签本身不参与）。
 *   state 是对象：每行一个「键: 值」，数组 / 对象写成 JSON；是字符串：原样放进去。
 */
export function withState(text: string, state?: Record<string, unknown> | string): string {
  const body = typeof state === 'string' ? state.trim() : state ? Object.entries(state).map(([k, v]) => `${k}: ${typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}`).join('\n') : ''
  return body ? `${text}\n\n<dj_state>\n${body}\n</dj_state>` : text
}

/** 把一条玩家原文拆回「说的话 / 状态块」（显示历史时用：只显示 text；没有状态块＝整条都是话） */
export function splitState(raw: string): { text: string; state: string } {
  const m = raw.match(/<dj_state>([\s\S]*?)<\/dj_state>/)
  if (!m || m.index === undefined) return { text: raw.trim(), state: '' }
  return { text: raw.slice(0, m.index).trim(), state: m[1].trim() }
}
