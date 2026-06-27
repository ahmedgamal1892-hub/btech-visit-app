import {
  AlertTriangle,
  BarChart3,
  Building2,
  Camera,
  PackageSearch,
  Sparkles,
  TrendingDown,
  Users,
} from 'lucide-react'
import { memo } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardInsight } from '@/features/dashboard/types/executive-dashboard.types'
import { cn } from '@/lib/utils'

const INSIGHT_ICONS = {
  'most-active-visitor': Users,
  'least-active-visitor': TrendingDown,
  'most-visited-branch': Building2,
  'least-visited-branch': Building2,
  'never-visited-branches': Building2,
  'not-visited-30-days': Building2,
  'top-brand': PackageSearch,
  'lowest-brand': PackageSearch,
  'most-photographed-product': Camera,
  'most-common-issue': AlertTriangle,
} as const

type ManagementInsightsPanelProps = {
  insights?: DashboardInsight[]
  isLoading?: boolean
}

export const ManagementInsightsPanel = memo(function ManagementInsightsPanel({
  insights = [],
  isLoading = false,
}: ManagementInsightsPanelProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-8 w-24" />
            <Skeleton className="mt-2 h-3 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (insights.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Management Insights
          </h2>
          <p className="text-sm text-muted-foreground">
            Operational highlights for leadership and regional managers.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => {
          const Icon =
            INSIGHT_ICONS[insight.id as keyof typeof INSIGHT_ICONS] ?? BarChart3

          return (
            <article
              key={insight.id}
              className={cn(
                'rounded-2xl border border-border/80 bg-card p-5 shadow-sm',
                'transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">
                    {insight.title}
                  </p>
                  <p className="mt-2 truncate text-2xl font-bold text-foreground">
                    {insight.value}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {insight.description}
                  </p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4.5" aria-hidden="true" />
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
})

export function ManagementInsightsSkeleton() {
  return <ManagementInsightsPanel isLoading />
}

export {
  ManagementInsightsPanel as DashboardInsights,
  ManagementInsightsSkeleton as DashboardInsightsSkeleton,
}
