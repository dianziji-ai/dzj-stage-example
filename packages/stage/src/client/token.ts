/**
 * 解开舞台 token 看里面写了什么（只读、不验签——签名只有服务器能验）。
 * 格式：st_ + base64url(JSON) + "." + 签名；JSON = { u 用户, s 会话, m 模型, c 线路, e 过期秒, o? 网站, d? 开发 }
 */
export type TokenInfo = { userId: number; sessionId: number; model: string; channel: string; expiresAt: Date; site: string | null; dev: boolean }

export function decodeToken(token: string): TokenInfo | null {
  try {
    if (!token.startsWith('st_')) return null
    const b64 = token.slice(3).split('.')[0].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const d = JSON.parse(new TextDecoder().decode(bytes))
    return { userId: d.u, sessionId: d.s, model: d.m, channel: d.c, expiresAt: new Date(d.e * 1000), site: d.o ?? null, dev: d.d === 1 }
  } catch {
    return null
  }
}
