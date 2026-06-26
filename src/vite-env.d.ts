/// <reference types="vite/client" />

declare module '*.ttf?url' {
  const url: string
  export default url
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_AUTH_EMAIL_DOMAIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
