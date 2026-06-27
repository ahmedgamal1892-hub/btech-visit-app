import { memo, useState } from 'react'

import { EmptyState } from '@/components/common'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardChartPoint } from '@/features/dashboard/types/executive-dashboard.types'
import { cn } from '@/lib/utils'

import {
  ChartLegend,
  ChartTooltip,
  MemoChartLegend,
  useElementWidth,
} from './chart-utils'

type ChartTooltipState = {
  label: string
  value: number
  x: number
  y: number
} | null

type DashboardBarChartProps = {
  points: DashboardChartPoint[]
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

function ChartSkeleton({
  orientation,
}: {
  orientation: 'vertical' | 'horizontal' | 'donut'
}) {
  if (orientation === 'donut') {
    return <Skeleton className="mx-auto size-48 rounded-full" />
  }

  if (orientation === 'horizontal') {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-56 items-end gap-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton
          key={index}
          className="flex-1 rounded-t-md"
          style={{ height: `${30 + (index % 4) * 15}%` }}
        />
      ))}
    </div>
  )
}

export const DashboardBarChart = memo(function DashboardBarChart({
  points,
  orientation = 'vertical',
  className,
}: DashboardBarChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const [tooltip, setTooltip] = useState<ChartTooltipState>(null)
  const animationKey = points
    .map((point) => `${point.label}:${point.value}`)
    .join('|')

  if (points.length === 0) {
    return (
      <EmptyState
        title="No chart data"
        description="Adjust filters or complete visits to populate this chart."
        className="py-10"
      />
    )
  }

  const maxValue = Math.max(...points.map((point) => point.value), 1)
  const compactLabels = width > 0 && width < 480

  if (orientation === 'horizontal') {
    return (
      <div ref={ref} key={animationKey} className={cn('space-y-3', className)}>
        {points.map((point, index) => (
          <div key={point.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium text-foreground">
                {point.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {point.value}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full origin-left rounded-full animate-[dashboard-bar-grow_700ms_ease-out_forwards]"
                style={{
                  width: `${(point.value / maxValue) * 100}%`,
                  backgroundColor: point.color ?? 'var(--primary)',
                  animationDelay: `${index * 40}ms`,
                }}
                onMouseEnter={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  const parent = ref.current?.getBoundingClientRect()
                  if (!parent) return
                  setTooltip({
                    label: point.label,
                    value: point.value,
                    x: rect.left - parent.left + rect.width / 2,
                    y: rect.top - parent.top - 8,
                  })
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            </div>
          </div>
        ))}
        <ChartTooltip tooltip={tooltip} />
        <MemoChartLegend points={points.slice(0, 6)} />
      </div>
    )
  }

  return (
    <div
      ref={ref}
      key={animationKey}
      className={cn('relative space-y-3', className)}
    >
      <div className="flex h-48 items-end gap-1.5 sm:h-56 sm:gap-2">
        {points.map((point, index) => (
          <div
            key={point.label}
            className="group flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div className="relative flex h-full w-full items-end justify-center">
              <div
                className="w-full max-w-10 origin-bottom rounded-t-lg animate-[dashboard-column-grow_700ms_ease-out_forwards] hover:opacity-90"
                style={{
                  height: `${Math.max((point.value / maxValue) * 100, 4)}%`,
                  backgroundColor: point.color ?? 'var(--primary)',
                  animationDelay: `${index * 35}ms`,
                }}
                onMouseEnter={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  const parent = ref.current?.getBoundingClientRect()
                  if (!parent) return
                  setTooltip({
                    label: point.label,
                    value: point.value,
                    x: rect.left - parent.left + rect.width / 2,
                    y: rect.top - parent.top - 8,
                  })
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            </div>
            {!compactLabels ? (
              <span className="max-w-full truncate text-[10px] text-muted-foreground sm:text-xs">
                {point.label}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <ChartTooltip tooltip={tooltip} />
      <MemoChartLegend points={compactLabels ? points : points.slice(0, 8)} />
    </div>
  )
})

export const DashboardDonutChart = memo(function DashboardDonutChart({
  points,
  className,
}: {
  points: DashboardChartPoint[]
  className?: string
}) {
  const animationKey = points
    .map((point) => `${point.label}:${point.value}`)
    .join('|')

  if (points.length === 0) {
    return (
      <EmptyState
        title="No status data"
        description="No visits match the current filters."
        className="py-10"
      />
    )
  }

  const total = points.reduce((sum, point) => sum + point.value, 0)
  const gradient = points
    .reduce<{ parts: string[]; cumulative: number }>(
      (state, point) => {
        const start = (state.cumulative / total) * 100
        const cumulative = state.cumulative + point.value
        const end = (cumulative / total) * 100

        return {
          cumulative,
          parts: [
            ...state.parts,
            `${point.color ?? 'var(--primary)'} ${start}% ${end}%`,
          ],
        }
      },
      { parts: [], cumulative: 0 },
    )
    .parts.join(', ')

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div
        key={animationKey}
        className="relative size-48 animate-[dashboard-donut-grow_700ms_ease-out_forwards] rounded-full"
        style={{
          background: `conic-gradient(${gradient})`,
        }}
      >
        <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-card text-center shadow-inner">
          <span className="text-3xl font-bold tabular-nums text-primary">
            {total}
          </span>
          <span className="text-xs text-muted-foreground">Total visits</span>
        </div>
      </div>
      <ChartLegend points={points} className="justify-center" />
    </div>
  )
})

type DashboardChartCardProps = {
  title: string
  description: string
  points: DashboardChartPoint[]
  variant?: 'bar-vertical' | 'bar-horizontal' | 'donut'
  isLoading?: boolean
}

export const DashboardChartCard = memo(function DashboardChartCard({
  title,
  description,
  points,
  variant = 'bar-vertical',
  isLoading = false,
}: DashboardChartCardProps) {
  return (
    <Card className="min-w-0 w-full max-w-full overflow-hidden rounded-2xl border-border/80 shadow-sm transition-shadow duration-300 hover:shadow-md">
      <CardHeader className="min-w-0">
        <CardTitle className="text-base break-words">{title}</CardTitle>
        <CardDescription className="break-words">{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 overflow-hidden">
        {isLoading ? (
          <ChartSkeleton
            orientation={
              variant === 'donut'
                ? 'donut'
                : variant === 'bar-horizontal'
                  ? 'horizontal'
                  : 'vertical'
            }
          />
        ) : variant === 'donut' ? (
          <DashboardDonutChart points={points} />
        ) : (
          <DashboardBarChart
            points={points}
            orientation={
              variant === 'bar-horizontal' ? 'horizontal' : 'vertical'
            }
          />
        )}
      </CardContent>
    </Card>
  )
})

export function DashboardChartsSkeleton() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 md:gap-5 min-[1440px]:grid-cols-2 min-[1440px]:gap-5">
      {Array.from({ length: 7 }).map((_, index) => (
        <Card key={index} className="rounded-2xl border-border/80 shadow-sm">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <ChartSkeleton
              orientation={index % 2 === 0 ? 'vertical' : 'horizontal'}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
