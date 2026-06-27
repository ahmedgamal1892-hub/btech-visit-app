import { Clock3 } from 'lucide-react'
import { memo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { RecentActivityRow } from '@/features/dashboard/types/executive-dashboard.types'
import { formatDashboardDateTime } from '@/features/dashboard/utils/build-executive-dashboard'

type RecentActivityTimelineProps = {
  rows?: RecentActivityRow[]
  isLoading?: boolean
}

export const RecentActivityTimeline = memo(function RecentActivityTimeline({
  rows = [],
  isLoading = false,
}: RecentActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="border-b border-border/70 px-5 py-4">
        <h2 className="text-lg font-semibold text-foreground">
          Recent Activity
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest submitted visits across the organization.
        </p>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No recent activity for the current filters.
          </p>
        ) : (
          rows.map((row) => (
            <article
              key={row.visitId}
              className="relative rounded-2xl border border-border/70 bg-background/60 p-4 pl-8 shadow-sm transition-colors hover:border-primary/20"
            >
              <span className="absolute top-5 left-3 size-2 rounded-full bg-primary" />
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {row.visitorName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {row.branchName}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {formatDashboardDateTime(row.visitTime)}
                  </span>
                  <Badge variant="secondary">{row.status}</Badge>
                  <Badge variant="secondary">{row.photoCount} photos</Badge>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
})
