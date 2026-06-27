import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type AlertBannerVariant = 'error' | 'success' | 'warning' | 'info'

type AlertBannerProps = {
  title?: string
  children: React.ReactNode
  variant?: AlertBannerVariant
  icon?: LucideIcon
  className?: string
}

const variantStyles: Record<AlertBannerVariant, string> = {
  error: 'border-destructive/20 bg-destructive/5 text-destructive',
  success: 'border-success/20 bg-success/5 text-success',
  warning: 'border-warning/20 bg-warning/5 text-warning',
  info: 'border-border bg-muted/50 text-foreground',
}

export function AlertBanner({
  title,
  children,
  variant = 'info',
  icon: Icon,
  className,
}: AlertBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border px-4 py-3 text-sm shadow-sm',
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        ) : null}
        <div className="min-w-0">
          {title ? <p className="font-medium">{title}</p> : null}
          <div className={cn(title && 'mt-1')}>{children}</div>
        </div>
      </div>
    </div>
  )
}
