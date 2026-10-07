// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { local, setStorageScope, storageScope } from '../../src/session/storage'

afterEach(() => {
  setStorageScope(null)
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('local：本机存储按卡分开', () => {
  it('键自动加 stage:{卡 id}: 前缀；两张卡同名不互相覆盖', () => {
    setStorageScope('card-a')
    local.set('bgm', 'off')
    expect(localStorage.getItem('stage:card-a:bgm')).toBe('off')
    setStorageScope('card-b')
    expect(local.get('bgm')).toBeNull()
    local.set('bgm', 'on')
    setStorageScope('card-a')
    expect(local.get('bgm')).toBe('off')
    expect(storageScope()).toBe('stage:card-a:')
  })

  it('还没连上（没卡 id）：读＝null、写不记', () => {
    local.set('x', '1')
    expect(localStorage.length).toBe(0)
    expect(local.get('x')).toBeNull()
    expect(local.getJSON('x', 7)).toBe(7)
    local.remove('x')
  })

  it('JSON：没有 / 坏了＝默认值', () => {
    setStorageScope('c')
    expect(local.getJSON('p', { on: true })).toEqual({ on: true })
    local.setJSON('p', { on: false })
    expect(local.getJSON('p', { on: true })).toEqual({ on: false })
    localStorage.setItem('stage:c:p', '{坏')
    expect(local.getJSON('p', 1)).toBe(1)
    local.remove('p')
    expect(local.get('p')).toBeNull()
  })

  it('隐私模式（localStorage 抛错）：读＝null、写 / 删不报错', () => {
    setStorageScope('c')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(local.get('a')).toBeNull()
    expect(() => local.set('a', '1')).not.toThrow()
    expect(() => local.remove('a')).not.toThrow()
  })
})
