import {
  LOGO_ALT,
  LOGO_DISPLAY_SIZES,
  LOGO_PATH,
} from '@/lib/constants/branding'
import { cn } from '@/lib/utils'

export type AppLogoSize = keyof typeof LOGO_DISPLAY_SIZES

type AppLogoProps = {
  size?: AppLogoSize
  className?: string
}

export function AppLogo({ size = 'md', className }: AppLogoProps) {
  const { height, maxWidth } = LOGO_DISPLAY_SIZES[size]

  return (
    <img
      src={LOGO_PATH}
      alt={LOGO_ALT}
      width={height}
      height={height}
      className={cn(
        'shrink-0 object-contain object-left transition-transform duration-200',
        className,
      )}
      style={{
        height,
        maxHeight: height,
        maxWidth,
        width: 'auto',
      }}
      draggable={false}
    />
  )
}
