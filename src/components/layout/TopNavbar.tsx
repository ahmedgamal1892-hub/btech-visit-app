import { Menu } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'
import { useAuth } from '@/hooks'

type TopNavbarProps = {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return 'BT'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function TopNavbar({
  onMenuClick,
  showMenuButton = false,
}: TopNavbarProps) {
  const { profile } = useAuth()
  const displayName = profile?.full_name ?? 'User'
  const roleLabel = profile?.role ?? 'Visitor'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90 md:px-6">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </Button>
        )}
        <div>
          <h1 className="text-base font-semibold text-foreground md:text-lg">
            {APP_NAME}
          </h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            B.TECH Visit Management
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </div>
        <Avatar className="size-9 border border-border">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
