import { Building2, TrendingUp } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import type { ExecutiveSummary } from '@/features/dashboard/types/executive-dashboard.types'

type ExecutiveSummaryCardProps = {
  summary?: ExecutiveSummary
  isLoading?: boolean
}

export function ExecutiveSummaryCard({
  summary,
  isLoading = false,
}: ExecutiveSummaryCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-10 w-full max-w-xl" />
        <Skeleton className="mt-3 h-4 w-56" />
      </div>
    )
  }

  const totalBranches = summary?.totalBranches ?? 0
  const visitedBranches = summary?.visitedBranches ?? 0
  const remainingBranches = summary?.remainingBranches ?? 0
  const completionPercent = summary?.completionPercent ?? 0

  return (
    <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Building2 className="size-3.5" aria-hidden="true" />
            Executive Summary
          </div>
          <p className="max-w-3xl text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">
            <span className="text-primary">{totalBranches}</span> branches ·{' '}
            <span className="text-primary">{visitedBranches}</span> already
            visited · <span className="text-primary">{remainingBranches}</span>{' '}
            remaining ·{' '}
            <span className="text-primary">{completionPercent}%</span>{' '}
            completion
          </p>
          <p className="text-sm text-muted-foreground">
            Coverage snapshot for the current filter selection.
          </p>
        </div>

        <div className="flex min-w-[180px] flex-col items-start rounded-2xl border border-primary/20 bg-card/80 px-5 py-4 shadow-sm lg:items-end">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="size-4 text-primary" aria-hidden="true" />
            Completion Rate
          </div>
          <p className="mt-1 text-4xl font-bold tabular-nums text-primary">
            {completionPercent}%
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
