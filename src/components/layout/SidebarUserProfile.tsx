import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getUserDisplayName, getUserInitials } from '@/lib/utils/user-display'
import { cn } from '@/lib/utils'

type SidebarUserProfileProps = {
  fullName?: string | null
  role?: string | null
  className?: string
}

export function SidebarUserProfile({
  fullName,
  role,
  className,
}: SidebarUserProfileProps) {
  const displayName = getUserDisplayName(fullName)
  const roleLabel = role ?? 'Visitor'

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl bg-sidebar-accent/60 px-3 py-3',
        className,
      )}
    >
      <Avatar className="size-10 border border-sidebar-border">
        <AvatarFallback className="bg-sidebar-primary/20 text-sm font-semibold text-sidebar-primary-foreground">
          {getUserInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-sidebar-foreground">
          {displayName}
        </p>
        <p className="truncate text-xs text-sidebar-foreground/70">
          {roleLabel}
        </p>
      </div>
    </div>
  )
}
