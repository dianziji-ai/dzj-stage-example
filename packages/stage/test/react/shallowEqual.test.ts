import { describe, expect, it } from 'vitest'
import { shallowEqual } from '../../src/react/shallowEqual'

describe('shallowEqual', () => {
  const save = { love: 1 }
  it('每一项是同一个值：相等（对象、数组都行）', () => {
    expect(shallowEqual({ a: 1, save }, { a: 1, save })).toBe(true)
    expect(shallowEqual([1, save], [1, save])).toBe(true)
    expect(shallowEqual(NaN, NaN)).toBe(true)
  })
  it('只比一层：内容一样但不是同一个对象＝不相等', () => {
    expect(shallowEqual({ save }, { save: { love: 1 } })).toBe(false)
  })
  it('键数不同、键名不同、一边是 null / 原始值：不相等', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(shallowEqual<Record<string, unknown>>({ a: undefined }, { b: undefined })).toBe(false)
    expect(shallowEqual<unknown>(null, {})).toBe(false)
    expect(shallowEqual<unknown>(1, '1')).toBe(false)
  })
})
