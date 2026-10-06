import { defineConfig } from 'vitest/config'

// 例子只测游戏自己的代码（src/）；SDK 的测试跟着包走：npm run test:sdk（或 cd packages/stage && npm test）
export default defineConfig({
  test: { include: ['src/**/*.test.{ts,tsx}'] },
})
