import { createStage, readLaunch } from '@dianziji/stage/client'

/**
 * 整个项目共用的一个舞台连接。
 *  · 线上：平台签好 token 放在舞台地址 # 后面，readLaunch() 读出来（读完从地址栏擦掉）。
 *  · 本地开发（npm run dev）：读 .env（见 .env.example）。
 * ★线上**不**退回 .env：打包会把 .env 写进 js，玩家打开开发者工具就看得到你的开发 token。
 *   vite.config.ts 打包时也会把这两项强制清空，双保险。都没有＝报「请从电子姬网站进入这张卡」。
 */
export const stage = createStage(
  readLaunch() ??
    (import.meta.env.DEV ? { api: import.meta.env.VITE_STAGE_API, token: import.meta.env.VITE_STAGE_TOKEN } : { api: '', token: '' }),
)
