import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStage, splitState, withState } from '../../src/index'

afterEach(() => vi.unstubAllGlobals())

describe('附带状态（withState / splitState）', () => {
  it('SDK 原样发；自己 withState 拼的状态块接在话后面，数组写成 JSON；拆得回来', async () => {
    let sent = ''
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body)).text
      return new Response(JSON.stringify({ turn_id: 't', stream_url: 'https://x/stream' }), { status: 200 })
    }))
    vi.stubGlobal('EventSource', class { addEventListener() {} close() {} onmessage = null })
    await createStage({ api: 'https://api', token: 'st_x' }).send(withState('你好', { 好感: 20, 已解锁的回忆: [1, 4] }), {})
    expect(sent).toBe('你好\n\n<dj_state>\n好感: 20\n已解锁的回忆: [1,4]\n</dj_state>')
    expect(splitState(sent)).toEqual({ text: '你好', state: '好感: 20\n已解锁的回忆: [1,4]' })
  })
  it('没给状态：原样；字符串状态原样放进去；没有状态块：整条都是话', async () => {
    expect(withState('你好')).toBe('你好')
    expect(withState('你好', {})).toBe('你好')
    expect(withState('你好', '当前状态\n刚连输 3 局抓娃娃')).toBe('你好\n\n<dj_state>\n当前状态\n刚连输 3 局抓娃娃\n</dj_state>')
    expect(splitState('  只是一句话 ')).toEqual({ text: '只是一句话', state: '' })
  })
})
