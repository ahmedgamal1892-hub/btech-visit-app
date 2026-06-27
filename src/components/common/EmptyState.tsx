import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { AppLogo } from '@/components/branding'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
  useBrandLogo?: boolean
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  useBrandLogo = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-md',
        className,
      )}
    >
      {useBrandLogo ? (
        <AppLogo className="mb-2" />
      ) : Icon ? (
        <div className="flex size-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-8" aria-hidden="true" />
        </div>
      ) : null}
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
