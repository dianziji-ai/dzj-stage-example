/*
 * 本机存储（按卡分开）：所有舞台都在同一个域名下，localStorage 是共用的——
 * 两张卡都写 `gal-bgm`，就会互相覆盖（照着官方例子改出来的舞台最容易撞）。
 * 这里的键自动加上 `stage:{卡 id}:` 前缀，读写都包 try（隐私模式 / 存储被禁用时 localStorage 会抛：读＝没有，写＝这次不记）。
 *
 *   import { local } from '@dianziji/stage'
 *   local.get('dialog')                 // 字符串；没有＝null
 *   local.set('dialog', 'expanded')
 *   local.getJSON('bgm', { on: true })  // 没有 / 坏了＝给的默认值
 *   local.setJSON('bgm', { on: false })
 *   local.remove('dialog')
 *
 * 卡 id 由 createSession（StageBoot 里）连上这一局时自动设好；在那之前读＝null、写不记（页面一加载就要读的，挪到连上之后再读）。
 * ★这只防「撞名」，不防「偷看」：同一个域名下的代码能读所有键。别把凭证 / 隐私写进本机存储。
 */
let scope: string | null = null

/** 设定当前这张卡（createSession 自动调；测试或不用会话时自己调） */
export function setStorageScope(cardId: string | null): void {
  scope = cardId ? `stage:${cardId}:` : null
}

/** 当前这张卡的前缀；还没连上＝null */
export function storageScope(): string | null {
  return scope
}

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export const local = {
  get(key: string): string | null {
    if (!scope) return null
    try {
      return store()?.getItem(scope + key) ?? null
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    if (!scope) return
    try {
      store()?.setItem(scope + key, value)
    } catch {
      /* 存不了（隐私模式 / 满了）：这次不记 */
    }
  },
  remove(key: string): void {
    if (!scope) return
    try {
      store()?.removeItem(scope + key)
    } catch {
      /* 同上 */
    }
  },
  getJSON<T>(key: string, fallback: T): T {
    const raw = local.get(key)
    if (raw === null) return fallback
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },
  setJSON(key: string, value: unknown): void {
    local.set(key, JSON.stringify(value))
  },
}
