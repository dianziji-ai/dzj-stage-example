import type { StageSchema } from '@dianziji/stage/client'

/** 面板里反复用到的样式（只用 sp-* 主题变量，换肤只改变量） */
export const mono = 'whitespace-pre-wrap [overflow-wrap:anywhere] rounded-xl border border-sp-line bg-sp-code p-3 font-mono text-xs leading-relaxed text-sp-text'
export const muted = 'text-sp-muted'
export const btnMain = 'rounded-full bg-sp-accent px-4 py-2 text-sm font-medium text-sp-on-accent transition-opacity hover:opacity-90 disabled:opacity-50'
export const btnSoft = 'rounded-full border border-sp-line bg-sp-card px-3.5 py-1.5 text-xs text-sp-muted transition-colors hover:text-sp-text disabled:opacity-50'

/** deepseek/deepseek-v3.2 → deepseek-v3.2（同聊天页：前缀对人没信息量，还挤） */
export const shortModel = (id: string | null | undefined) => id?.split('/').pop() || '—'
/** 5820 → 5.8k */
export const tokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
/** 今天的只给「时:分」，别的日子带上「月-日」 */
export function clock(iso: string): string {
  const d = new Date(iso)
  const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toDateString() === new Date().toDateString() ? hm : `${d.getMonth() + 1}-${d.getDate()} ${hm}`
}

/** 开局存档＝根 properties 里各字段的 default（与服务器同口径） */
export function initialOf(schema: StageSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, p] of Object.entries(schema.properties ?? {})) if (p && 'default' in p) out[k] = p.default
  return out
}
