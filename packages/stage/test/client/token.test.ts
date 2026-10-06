import { describe, expect, it } from 'vitest'
import { decodeToken } from '../../src/client/token'

/** 照后端 StageTokenCodec 的格式造一个：st_ + base64url(JSON) + "." + 签名 */
const mint = (payload: Record<string, unknown>) => {
  const json = new TextEncoder().encode(JSON.stringify(payload))
  const b64 = btoa(String.fromCharCode(...json)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `st_${b64}.sig`
}

describe('decodeToken', () => {
  it('解出会话、模型、线路、过期时间、网站、开发标记（中文也不乱码）', () => {
    const info = decodeToken(mint({ u: 7, s: 36933, m: 'deepseek/v3', c: '线路一', e: 1_800_000_000, o: 'https://dianziji.ai', d: 1 }))
    expect(info).toEqual({ userId: 7, sessionId: 36933, model: 'deepseek/v3', channel: '线路一', expiresAt: new Date(1_800_000_000_000), site: 'https://dianziji.ai', dev: true })
  })
  it('老 token 没有网站 / 开发：site=null、dev=false', () => {
    const info = decodeToken(mint({ u: 1, s: 2, m: 'm', c: 'c', e: 1 }))
    expect(info?.site).toBeNull()
    expect(info?.dev).toBe(false)
  })
  it('base64url 的 - 和 _ 都认（JSON 里有会编出 +/ 的字节）', () => {
    const info = decodeToken(mint({ u: 1, s: 2, m: '>>>???', c: 'ÿÿ', e: 1 }))
    expect(info?.model).toBe('>>>???')
    expect(info?.channel).toBe('ÿÿ')
  })
  it('格式不对一律 null，不抛错', () => {
    expect(decodeToken('')).toBeNull()
    expect(decodeToken('sk_abc')).toBeNull()
    expect(decodeToken('st_不是base64.sig')).toBeNull()
    expect(decodeToken(`st_${btoa('not json')}.sig`)).toBeNull()
  })
})
