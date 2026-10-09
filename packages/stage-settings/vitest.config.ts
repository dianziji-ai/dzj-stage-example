import { defineConfig } from 'vitest/config'

// @dianziji/stage-settings 自己的测试。test/ 和 src/ 一一对应（test/structure.test.ts 检查不漏）。一律 jsdom。
export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 88 },
    },
  },
})
