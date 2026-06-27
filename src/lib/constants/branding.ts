export const APP_NAME = 'BTECH Visit App'
export const APP_TAGLINE = 'Store Visit Management System'
export const LOGO_PATH = '/logo.png'
export const LOGO_ALT = 'BTECH logo'
export const LOGO_ASPECT_RATIO = 1
export const LOGO_SIZE_PX = 40

export const LOGO_DISPLAY_SIZES = {
  sm: { height: 28, maxWidth: 112 },
  md: { height: 40, maxWidth: 160 },
  lg: { height: 56, maxWidth: 224 },
  xl: { height: 72, maxWidth: 288 },
} as const

export const BRAND_COLORS = {
  primary: '#FF6A00',
  dark: '#111827',
  background: '#F8F9FB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
} as const

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)

  if (Number.isNaN(value) || normalized.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`)
  }

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export const BRAND_COLORS_RGB = {
  primary: hexToRgb(BRAND_COLORS.primary),
  dark: hexToRgb(BRAND_COLORS.dark),
  background: hexToRgb(BRAND_COLORS.background),
  card: hexToRgb(BRAND_COLORS.card),
  border: hexToRgb(BRAND_COLORS.border),
  success: hexToRgb(BRAND_COLORS.success),
  warning: hexToRgb(BRAND_COLORS.warning),
  danger: hexToRgb(BRAND_COLORS.danger),
} as const

export const PDF_BRANDING = {
  appName: APP_NAME,
  companyName: 'BTECH',
  tagline: APP_TAGLINE,
  footerText: `© BTECH - ${APP_TAGLINE}`,
  logoPath: LOGO_PATH,
} as const
