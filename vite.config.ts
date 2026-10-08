import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** 加载页底部的构建号：打包时＝「BUILD 打包时刻的时间戳（秒）」，每次打包都不一样；本地开发＝「BUILD dev」 */
function stageVersion(build: boolean): string {
  return `BUILD ${build ? Math.floor(Date.now() / 1000) : 'dev'}`
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // 相对路径：上传后放在 {卡id}/{版本号}/ 下，js / css / 图片都按相对 index.html 的位置找
  base: './',
  // 本地开发在网站里加载（工具行「开发」→ 本地开发）：https 的网站页面嵌 http://localhost，
  // Chrome 的私有网络访问会先问一句，这个头回答「允许」
  server: { headers: { 'Access-Control-Allow-Private-Network': 'true' } },
  define: {
    __STAGE_VERSION__: JSON.stringify(stageVersion(command === 'build')),
  },
}))
