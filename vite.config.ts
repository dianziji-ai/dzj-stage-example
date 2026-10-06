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
  // ★打包时把 .env 里的开发连接强制清空：线上 token 由平台放在 # 后面（readLaunch），
  //   .env 的开发 token 一旦打进 js，玩家打开开发者工具就能拿去花你的能量
  define: {
    __STAGE_VERSION__: JSON.stringify(stageVersion(command === 'build')),
    ...(command === 'build' ? { 'import.meta.env.VITE_STAGE_API': '""', 'import.meta.env.VITE_STAGE_TOKEN': '""' } : {}),
  },
}))
