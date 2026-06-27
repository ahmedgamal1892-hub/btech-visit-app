import type { LucideIcon } from 'lucide-react'
import { Clock3, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { memo } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardTrend } from '@/features/dashboard/types/executive-dashboard.types'
import { formatDashboardDateTime } from '@/features/dashboard/utils/build-executive-dashboard'
import { cn } from '@/lib/utils'

type ExecutiveKpiCardProps = {
  title: string
  subtitle: string
  icon: LucideIcon
  value?: string | number
  trend?: DashboardTrend
  lastUpdatedAt?: number
  isLoading?: boolean
  className?: string
}

function TrendIndicator({ trend }: { trend?: DashboardTrend }) {
  if (!trend) {
    return null
  }

  const Icon =
    trend.direction === 'up'
      ? TrendingUp
      : trend.direction === 'down'
        ? TrendingDown
        : Minus

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        trend.direction === 'up' && 'bg-success/10 text-success',
        trend.direction === 'down' && 'bg-destructive/10 text-destructive',
        trend.direction === 'neutral' && 'bg-muted text-muted-foreground',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {trend.label}
    </span>
  )
}

export const ExecutiveKpiCard = memo(function ExecutiveKpiCard({
  title,
  subtitle,
  icon: Icon,
  value = '—',
  trend,
  lastUpdatedAt,
  isLoading = false,
  className,
}: ExecutiveKpiCardProps) {
  return (
    <Card
      className={cn(
        'group min-w-0 w-full max-w-full overflow-hidden rounded-2xl border-border/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md',
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="min-w-0 flex-1 space-y-2">
          <CardTitle className="text-sm font-medium break-words text-muted-foreground">
            {title}
          </CardTitle>
          {trend ? (
            <span className="inline-block max-w-full">
              <TrendIndicator trend={trend} />
            </span>
          ) : null}
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
          <Icon className="size-4.5" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {isLoading ? (
          <>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-32" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tracking-tight break-words text-foreground tabular-nums sm:text-3xl">
              {value}
            </p>
            <CardDescription className="text-xs leading-relaxed">
              {subtitle}
            </CardDescription>
            {lastUpdatedAt ? (
              <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock3 className="size-3" aria-hidden="true" />
                Updated{' '}
                {formatDashboardDateTime(new Date(lastUpdatedAt).toISOString())}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
})

export function ExecutiveKpiGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 min-[1440px]:grid-cols-4 min-[1440px]:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="min-w-0 w-full max-w-full rounded-2xl border-border/80 shadow-sm"
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="size-10 rounded-xl" />
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
