import { defineConfig } from 'vitest/config'

// @dianziji/stage 自己的测试（和 SDK 放在一起，不进官方例子的游戏代码）。
// test/ 和 src/ 一一对应：src/client/stage.ts ↔ test/client/stage.test.ts（test/layers.test.ts 检查不漏）。
// 默认 node 环境；要 DOM 的测试文件头写 // @vitest-environment jsdom
export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/**/*.gen.*', 'src/**/*.d.ts', 'src/client/types.ts'],
      reporter: ['text-summary', 'text'],
      // 门槛：低于就算失败（npm test 会带覆盖率跑）
      thresholds: { lines: 98, statements: 95, functions: 95, branches: 88 },
    },
  },
})
