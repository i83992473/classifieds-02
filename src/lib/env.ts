export const env = {
  assetsOrigin: import.meta.env.VITE_ASSETS_ORIGIN ?? '',
  devMainAppOrigin: import.meta.env.VITE_DEV_MAIN_APP_ORIGIN ?? 'http://localhost:8787',
} as const

export type Env = typeof env
