/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STAGE_API: string
  readonly VITE_STAGE_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
