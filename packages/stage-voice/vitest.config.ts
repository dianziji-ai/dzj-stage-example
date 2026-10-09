import { defineConfig } from 'vitest/config'

// @dianziji/stage-voice 自己的测试。一律 jsdom。
export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text-summary', 'text'],
    },
  },
})
