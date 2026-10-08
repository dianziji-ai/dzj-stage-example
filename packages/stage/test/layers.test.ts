import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// 结构守卫：①上层只能依赖下层（client 零依赖；session 只认 client；view 只认 micromark；都不碰 React）
//           ②每个模块都有同名测试：src/client/stage.ts ↔ test/client/stage.test.ts
const SRC = join(__dirname, '../src')

function importsOf(dir: string): { file: string; from: string }[] {
  return readdirSync(join(SRC, dir))
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'))
    .flatMap((f) => [...readFileSync(join(SRC, dir, f), 'utf8').matchAll(/^\s*(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/gm)].map((m) => ({ file: `${dir}/${f}`, from: m[1] })))
}

const LAYERS: Record<string, (from: string) => boolean> = {
  client: (from) => from.startsWith('./'),
  session: (from) => from.startsWith('./') || from === '../client',
  view: (from) => from.startsWith('./') || from === 'micromark',
}

describe('分层', () => {
  for (const [dir, ok] of Object.entries(LAYERS)) {
    it(`${dir} 只依赖允许的下层`, () => {
      const bad = importsOf(dir).filter((i) => !ok(i.from))
      expect(bad).toEqual([])
    })
  }

  it('client 入口不需要任何第三方包', async () => {
    const mod = await import('../src/client')
    expect(Object.keys(mod).sort()).toEqual(['PROTOCOL', 'STAGE_TOOLS', 'StageError', 'createStage', 'isBridgeMessage', 'splitState', 'withState'])
  })

  it('根入口带上客户端的全部导出', async () => {
    const [root, client] = await Promise.all([import('../src/index'), import('../src/client')])
    for (const k of Object.keys(client)) expect(root).toHaveProperty(k, (client as Record<string, unknown>)[k])
  })
})

/** 不需要单独测试文件的：只有类型的（tsc 查）、入口（只做转导出，上面「根入口」那条测了）、一行的 createContext、生成文件 */
const NO_TEST = new Set(['client/types.ts', 'index.ts', 'client/index.ts', 'react/index.ts', 'react/context.ts', 'session/zones.gen.js'])

function modules(dir = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    if (e.isDirectory()) return modules(p)
    return /\.(ts|tsx|js)$/.test(e.name) && !e.name.endsWith('.d.ts') ? [relative(SRC, p)] : []
  })
}

describe('每个模块都有测试', () => {
  it('src/x/y.ts 对应 test/x/y.test.ts(x)', () => {
    const missing = modules()
      .filter((m) => !NO_TEST.has(m))
      .filter((m) => {
        const base = join(__dirname, m.replace(/\.(ts|tsx|js)$/, ''))
        return !existsSync(`${base}.test.ts`) && !existsSync(`${base}.test.tsx`)
      })
    expect(missing).toEqual([])
  })
})
