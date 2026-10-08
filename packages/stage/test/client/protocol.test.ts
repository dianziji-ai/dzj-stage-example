import { describe, expect, it } from 'vitest'
import { isBridgeMessage, PROTOCOL, STAGE_TOOLS } from '../../src/client/protocol'

describe('桥消息', () => {
  it('只认带 dzj: stage 和 type 的；别的 postMessage（别的库、浏览器插件）一律不是', () => {
    expect(isBridgeMessage({ dzj: 'stage', v: PROTOCOL, type: 'init' })).toBe(true)
    expect(isBridgeMessage({ dzj: 'stage', v: 99, type: 'update' })).toBe(true) // 版本对不对由收的那边判断（要报错，不能当没看见）
    for (const d of [null, undefined, 'stage', 1, {}, { type: 'init' }, { dzj: 'other', type: 'init' }, { dzj: 'stage' }, { dzj: 'stage', type: 3 }]) {
      expect(isBridgeMessage(d)).toBe(false)
    }
  })

  it('网站能打开的工具就这五个', () => {
    expect([...STAGE_TOOLS]).toEqual(['model', 'mod', 'session', 'memory', 'chat'])
  })
})
