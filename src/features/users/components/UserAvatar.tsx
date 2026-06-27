import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getUserDisplayName, getUserInitials } from '@/lib/utils/user-display'
import { cn } from '@/lib/utils'

type UserAvatarProps = {
  fullName: string
  username: string
  className?: string
}

export function UserAvatar({ fullName, username, className }: UserAvatarProps) {
  const displayName = getUserDisplayName(fullName, username)

  return (
    <Avatar
      className={cn(
        'border border-border/80 bg-primary/5 text-primary shadow-sm',
        className,
      )}
    >
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
        {getUserInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  )
}
