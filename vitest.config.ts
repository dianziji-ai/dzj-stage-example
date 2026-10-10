import { defineConfig } from 'vitest/config'

// 例子只测游戏自己的代码（src/）；SDK 是 npm 包，它的测试在 SDK 仓库 dianziji-ai/dzj-stage-sdk
export default defineConfig({
  test: { include: ['src/**/*.test.{ts,tsx}'] },
})
