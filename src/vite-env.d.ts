/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASSETS_ORIGIN?: string
  readonly VITE_DEV_MAIN_APP_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
