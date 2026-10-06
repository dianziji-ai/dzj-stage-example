// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readLaunch } from '../../src/client/launch'

afterEach(() => {
  vi.restoreAllMocks() // 先还原（有的用例把 replaceState 换成了会抛错的）
  history.replaceState(null, '', '/')
})

describe('readLaunch：从平台进入时 # 后面的连接', () => {
  it('读出 api 和 token，读完从地址栏擦掉（路径、查询参数留着）', () => {
    history.replaceState(null, '', '/c1/v1/index.html?x=1#api=https%3A%2F%2Fapi.dianziji.ai%2Fapi%2Fv1%2Fstage&token=st_abc.sig')
    expect(readLaunch()).toEqual({ api: 'https://api.dianziji.ai/api/v1/stage', token: 'st_abc.sig' })
    expect(location.pathname + location.search + location.hash).toBe('/c1/v1/index.html?x=1')
    expect(readLaunch()).toBeNull() // 擦掉了：再读就没有
  })

  it('# 后面别的东西（舞台自己的路由）留着', () => {
    history.replaceState(null, '', '/#page=map&api=a&token=t')
    expect(readLaunch()).toEqual({ api: 'a', token: 't' })
    expect(location.hash).toBe('#page=map')
  })

  it('没有 # / 缺一项：null（不擦任何东西）', () => {
    expect(readLaunch()).toBeNull()
    history.replaceState(null, '', '/#token=t')
    expect(readLaunch()).toBeNull()
    expect(location.hash).toBe('#token=t')
  })

  it('沙盒不让改地址：照常返回连接，不报错', () => {
    history.replaceState(null, '', '/#api=a&token=t')
    vi.spyOn(history, 'replaceState').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(readLaunch()).toEqual({ api: 'a', token: 't' })
  })
})
