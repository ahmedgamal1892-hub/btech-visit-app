import { Menu } from 'lucide-react'

import { AppLogo } from '@/components/branding'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { GhostButton } from '@/components/ui/action-buttons'
import { useAuth } from '@/hooks'
import { getUserDisplayName, getUserInitials } from '@/lib/utils/user-display'

type TopNavbarProps = {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function TopNavbar({
  onMenuClick,
  showMenuButton = false,
}: TopNavbarProps) {
  const { profile } = useAuth()
  const displayName = getUserDisplayName(profile?.full_name)
  const roleLabel = profile?.role ?? 'Visitor'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {showMenuButton && (
          <GhostButton
            size="icon"
            className="shrink-0 md:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </GhostButton>
        )}
        <AppLogo size="sm" className="shrink-0" />
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-foreground md:text-lg">
            {APP_NAME}
          </h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {APP_TAGLINE}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </div>
        <Avatar className="size-9 border border-border">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {getUserInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
