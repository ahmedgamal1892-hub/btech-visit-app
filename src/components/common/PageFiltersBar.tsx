import { Filter, RefreshCw, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PageFiltersBarProps = {
  title: string
  description?: string
  children: ReactNode
  onReset?: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
  actions?: ReactNode
  className?: string
}

export function PageFiltersBar({
  title,
  description,
  children,
  onReset,
  onRefresh,
  isRefreshing = false,
  actions,
  className,
}: PageFiltersBarProps) {
  return (
    <section
      className={cn('filter-bar', className)}
      aria-label={`${title} filters`}
    >
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h3 className="section-title text-base">{title}</h3>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>

        {onReset || onRefresh || actions ? (
          <div className="flex flex-wrap items-center gap-2">
            {onReset ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReset}
                title="Reset filters"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </Button>
            ) : null}
            {onRefresh ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh data"
              >
                <RefreshCw
                  className={cn('size-4', isRefreshing && 'animate-spin')}
                  aria-hidden="true"
                />
                Refresh
              </Button>
            ) : null}
            {actions}
          </div>
        ) : null}
      </div>

      {children}
    </section>
  )
}
