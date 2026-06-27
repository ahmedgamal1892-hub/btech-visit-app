export const APP_VERSION = '1.2.0'
export const BUILD_VERSION =
  import.meta.env.MODE === 'production' ? 'production' : 'development'
export const APP_ENVIRONMENT = import.meta.env.MODE
