import {
  Award,
  Building2,
  CalendarDays,
  Camera,
  Clock3,
  PackageSearch,
  TrendingUp,
} from 'lucide-react'
import { memo } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import type { PersonalPerformance } from '@/features/dashboard/types/executive-dashboard.types'
import { formatDashboardDateTime } from '@/features/dashboard/utils/build-executive-dashboard'
import { cn } from '@/lib/utils'

type MyPerformanceSectionProps = {
  performance?: PersonalPerformance
  isLoading?: boolean
}

function PerformanceMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: typeof CalendarDays
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-xl font-bold break-words text-foreground tabular-nums sm:text-2xl">
            {value}
          </p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4.5" aria-hidden="true" />
        </div>
      </div>
    </article>
  )
}

export const MyPerformanceSection = memo(function MyPerformanceSection({
  performance,
  isLoading = false,
}: MyPerformanceSectionProps) {
  if (isLoading) {
    return (
      <section className="min-w-0 space-y-3 md:space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 min-[1440px]:grid-cols-3 min-[1440px]:gap-4">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      </section>
    )
  }

  if (!performance) {
    return null
  }

  const rankLabel =
    performance.currentRank && performance.totalRankedVisitors > 0
      ? `#${performance.currentRank} of ${performance.totalRankedVisitors}`
      : 'Unranked'

  return (
    <section className="min-w-0 space-y-3 md:space-y-4">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold break-words text-foreground">
          My Performance
        </h2>
        <p className="text-sm break-words text-muted-foreground">
          Your personal visit activity and contribution snapshot.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 min-[1440px]:grid-cols-3 min-[1440px]:gap-4">
        <PerformanceMetric
          label="My Visits Today"
          value={performance.visitsToday}
          icon={CalendarDays}
        />
        <PerformanceMetric
          label="My Visits This Week"
          value={performance.visitsThisWeek}
          icon={TrendingUp}
        />
        <PerformanceMetric
          label="My Visits This Month"
          value={performance.visitsThisMonth}
          icon={CalendarDays}
        />
        <PerformanceMetric
          label="My Last Visit"
          value={formatDashboardDateTime(performance.lastVisitDate)}
          icon={Clock3}
        />
        <PerformanceMetric
          label="Last Branch Visited"
          value={performance.lastBranchVisited ?? '—'}
          icon={Building2}
        />
        <PerformanceMetric
          label="Total Photos Uploaded"
          value={performance.totalPhotosUploaded}
          icon={Camera}
        />
        <PerformanceMetric
          label="Total Products Checked"
          value={performance.totalProductsChecked}
          icon={PackageSearch}
        />
        <PerformanceMetric
          label="Average Visit Duration"
          value={performance.averageVisitDurationLabel}
          icon={Clock3}
        />
        <article
          className={cn(
            'min-w-0 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-4 shadow-sm',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">My Current Rank</p>
              <p className="mt-2 text-2xl font-bold text-primary">
                {rankLabel}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Award className="size-4.5" aria-hidden="true" />
            </div>
          </div>
        </article>
      </div>
    </section>
  )
})
