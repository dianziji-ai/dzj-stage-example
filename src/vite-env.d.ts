/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STAGE_API: string
  readonly VITE_STAGE_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 构建号「BUILD 时间戳」（vite.config.ts 打包时写进来，显示在加载页底部） */
declare const __STAGE_VERSION__: string
