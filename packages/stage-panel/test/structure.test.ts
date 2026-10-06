import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// 结构守卫：①面板只依赖 react 和 SDK（@dianziji/stage/client、分区解析用 @dianziji/stage），不碰游戏代码
//           ②每个模块都有同名测试：src/tabs/Save.tsx ↔ test/tabs/Save.test.tsx
const SRC = join(__dirname, '../src')
const ALLOWED = new Set(['react', '@dianziji/stage', '@dianziji/stage/client'])
/** 不需要单独测试文件的：入口（只做转导出，StagePanel.test 从它引） */
const NO_TEST = new Set(['index.ts'])

function modules(dir = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    if (e.isDirectory()) return modules(p)
    return /\.(ts|tsx)$/.test(e.name) ? [relative(SRC, p)] : []
  })
}

describe('结构', () => {
  it('只依赖 react 和 SDK', () => {
    const bad = modules().flatMap((m) =>
      [...readFileSync(join(SRC, m), 'utf8').matchAll(/^\s*(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/gm)]
        .map((x) => x[1])
        .filter((from) => !from.startsWith('.') && !ALLOWED.has(from))
        .map((from) => `${m} → ${from}`),
    )
    expect(bad).toEqual([])
  })

  it('每个模块都有测试', () => {
    const missing = modules()
      .filter((m) => !NO_TEST.has(m))
      .filter((m) => {
        const base = join(__dirname, m.replace(/\.(ts|tsx)$/, ''))
        return !existsSync(`${base}.test.ts`) && !existsSync(`${base}.test.tsx`)
      })
    expect(missing).toEqual([])
  })
})
