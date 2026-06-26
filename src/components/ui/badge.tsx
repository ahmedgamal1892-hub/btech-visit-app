import type * as React from 'react'

import { cn } from '@/lib/utils'

type BadgeProps = React.ComponentProps<'span'> & {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary/10 text-primary',
        variant === 'secondary' && 'bg-muted text-muted-foreground',
        variant === 'success' && 'bg-emerald-100 text-emerald-800',
        variant === 'warning' && 'bg-amber-100 text-amber-800',
        variant === 'destructive' && 'bg-destructive/10 text-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
