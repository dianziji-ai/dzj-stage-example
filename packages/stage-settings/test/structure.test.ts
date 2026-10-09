import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// 结构守卫：①独立模块——只依赖 react，不依赖舞台 SDK、不碰游戏代码 ②每个模块都有同名测试
const SRC = join(__dirname, '../src')
const NO_TEST = new Set(['index.ts'])
const files = readdirSync(SRC).filter((f) => /\.(ts|tsx)$/.test(f))

describe('结构', () => {
  it('只依赖 react', () => {
    const bad = files.flatMap((f) =>
      [...readFileSync(join(SRC, f), 'utf8').matchAll(/^\s*(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/gm)]
        .map((m) => m[1])
        .filter((from) => !from.startsWith('.') && from !== 'react')
        .map((from) => `${f} → ${from}`),
    )
    expect(bad).toEqual([])
  })
  it('每个模块都有测试', () => {
    const missing = files.filter((f) => !NO_TEST.has(f) && !existsSync(join(__dirname, f.replace(/\.tsx?$/, (x) => `.test${x === '.ts' ? '.ts' : '.tsx'}`))) && !existsSync(join(__dirname, f.replace(/\.tsx?$/, '.test.tsx'))))
    expect(missing).toEqual([])
  })
})
