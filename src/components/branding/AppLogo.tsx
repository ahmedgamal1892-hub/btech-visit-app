import { LOGO_ALT, LOGO_PATH, LOGO_SIZE_PX } from '@/lib/constants/branding'
import { cn } from '@/lib/utils'

export type AppLogoSize = 'md'

const sizePx: Record<AppLogoSize, number> = {
  md: LOGO_SIZE_PX,
}

type AppLogoProps = {
  size?: AppLogoSize
  className?: string
}

export function AppLogo({ size = 'md', className }: AppLogoProps) {
  const dimension = sizePx[size]

  return (
    <img
      src={LOGO_PATH}
      alt={LOGO_ALT}
      width={dimension}
      height={dimension}
      className={cn(
        'shrink-0 object-contain transition-transform duration-200',
        className,
      )}
      draggable={false}
    />
  )
}
