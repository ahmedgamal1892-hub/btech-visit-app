import { APP_NAME, APP_TAGLINE } from '@/lib/constants/branding'
import { cn } from '@/lib/utils'

import { AppLogo } from './AppLogo'

type AppBrandProps = {
  variant?: 'default' | 'on-dark'
  showTagline?: boolean
  centered?: boolean
  className?: string
  titleClassName?: string
  taglineClassName?: string
}

export function AppBrand({
  variant = 'default',
  showTagline = false,
  centered = false,
  className,
  titleClassName,
  taglineClassName,
}: AppBrandProps) {
  const isOnDark = variant === 'on-dark'

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        centered && 'flex-col text-center',
        className,
      )}
    >
      <AppLogo />
      <div className={cn('min-w-0', centered && 'space-y-1')}>
        <p
          className={cn(
            'truncate font-bold tracking-tight',
            isOnDark ? 'text-sm text-sidebar-foreground' : 'text-foreground',
            titleClassName,
          )}
        >
          {APP_NAME}
        </p>
        {showTagline && (
          <p
            className={cn(
              'truncate text-xs',
              isOnDark ? 'text-sidebar-foreground/70' : 'text-muted-foreground',
              taglineClassName,
            )}
          >
            {APP_TAGLINE}
          </p>
        )}
      </div>
    </div>
  )
}
