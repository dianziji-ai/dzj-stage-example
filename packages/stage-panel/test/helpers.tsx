import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { StageError, type StageClient, type StageGallery, type StageMessage, type StageSnapshot, type TokenInfo } from '@dianziji/stage/client'

/** 每个用例后卸载、还原 mock */
export function setupPanelTests() {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })
}

export const msg = (id: number, role: 'user' | 'assistant', content: string, extra: Partial<StageMessage> = {}): StageMessage => ({ id, role, kind: null, content, ...extra })

export const spend = { cost: 1200, model: 'deepseek/deepseek-v3.2', channel: '线路一', out_tokens: 800, in_tokens: 5820, in_cost: 400, out_cost: 800 }

/** 一局像样的快照：有玩家、初始设定、两轮历史（AI 那轮扣了能量）、存档结构、分区 */
export const snapOf = (p: Partial<StageSnapshot> = {}): StageSnapshot => ({
  card: { id: 'card1', name: '电子姬的约会' },
  site: 'https://dianziji.ai',
  dev: false,
  user: { id: 7, username: 'linchuan', name: '林川', avatar: 'https://cdn/a.webp' },
  asset_base: 'https://cdn',
  slots: [
    { zone: 'face', kind: 'yaml', label: '表情', icon: '😊', schema: '表情: 【normal/happy】', instruction: '每轮写' },
    { zone: 'narrative', kind: 'markdown', label: '正文' },
    { zone: 'action', label: '选项' },
    { zone: 'memo', label: '备忘', enabled: false, extra: 1 },
  ],
  state_schema: { type: 'object', properties: { love: { type: 'integer', default: 20 }, mood: { type: 'string' } } },
  image_pack: null,
  setup: { text: '名字：林川\n称呼：前辈', fields: [{ key: 'user', label: '名字', value: '林川' }, { key: 'call', label: '称呼', value: null }] },
  history: [
    msg(1, 'assistant', '<face>\n表情: happy\n</face>\n<narrative>\n她笑了。\n</narrative>', { kind: 'opening' }),
    msg(2, 'user', '你好', { created_at: '2026-10-06T10:00:00Z' }),
    msg(3, 'assistant', '<narrative>\n嗯？\n</narrative>', { spend, status: 'ok', created_at: '2026-10-06T10:00:05Z' }),
  ],
  has_more: false,
  save: { love: 20 },
  streaming: null,
  ...p,
})

export const galleryOf = (p: Partial<StageGallery> = {}): StageGallery => ({
  turns: 12,
  previews: [{ src: 'https://cdn/p1.webp', thumb: 'https://cdn/p1-t.webp' }],
  packs: [
    { name: '日常', state: 'open', rounds: 0, count: 2, cover: 'https://cdn/d1-t.webp', images: [{ src: 'https://cdn/d1.webp', thumb: 'https://cdn/d1-t.webp' }, { src: 'https://cdn/d2.webp', thumb: 'https://cdn/d2-t.webp' }] },
    { name: '告白', state: 'locked', rounds: 30, count: 3, cover: null, images: [] },
    { name: '秘密', state: 'hidden', rounds: -1, count: 5, cover: null, images: [] },
  ],
  ...p,
})

/** 假 stage：load / gallery / save 都是 vi.fn，默认成功 */
export function fakeStage(snap: StageSnapshot = snapOf(), token: Partial<TokenInfo> | null = {}) {
  const info: TokenInfo | null = token && { userId: 7, sessionId: 36933, model: 'deepseek/deepseek-v3.2', channel: '线路一', expiresAt: new Date(Date.now() + 5 * 3600_000), site: 'https://dianziji.ai', dev: false, ...token }
  return {
    load: vi.fn(async () => snap),
    gallery: vi.fn(async () => galleryOf()),
    save: vi.fn(async () => ({ ok: true as const, size: 10 })),
    tokenInfo: () => info,
    siteUrl: (p: string) => `https://dianziji.ai${p}`,
    on: () => () => {},
  } as unknown as StageClient & { load: ReturnType<typeof vi.fn>; gallery: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> }
}

export const fail = (message: string, code: 'network' | 'invalid' = 'network') => new StageError(code, message)
