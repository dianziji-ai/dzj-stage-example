// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { applySafeArea } from '../../src/view/viewport'

const css = (k: string) => document.documentElement.style.getPropertyValue(k)
const safe = () => [css('--safe-top'), css('--safe-right'), css('--safe-bottom'), css('--safe-left')]

beforeEach(() => document.documentElement.removeAttribute('style'))

describe('applySafeArea：快照里的安全区写成 <html> 上的变量', () => {
  it('四边都写（取整、负数当 0、不是数字当 0）', () => {
    applySafeArea({ top: 59.6, right: -3, bottom: 34, left: Number.NaN })
    expect(safe()).toEqual(['60px', '0px', '34px', '0px'])
  })

  it('变了就覆盖', () => {
    applySafeArea({ top: 59, right: 0, bottom: 34, left: 0 })
    applySafeArea({ top: 0, right: 44, bottom: 21, left: 44 })
    expect(safe()).toEqual(['0px', '44px', '21px', '44px'])
  })

  it('没有（还没连上）：不动', () => {
    applySafeArea({ top: 10, right: 0, bottom: 0, left: 0 })
    applySafeArea(null)
    applySafeArea(undefined)
    expect(css('--safe-top')).toBe('10px')
  })
})
