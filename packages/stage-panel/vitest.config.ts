import { defineConfig } from 'vitest/config'

// @dianziji/stage-panel 自己的测试。test/ 和 src/ 一一对应：src/tabs/Save.tsx ↔ test/tabs/Save.test.tsx（test/structure.test.ts 检查不漏）。
// 全是组件：一律 jsdom。
export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 98, statements: 95, functions: 95, branches: 88 },
    },
  },
})
