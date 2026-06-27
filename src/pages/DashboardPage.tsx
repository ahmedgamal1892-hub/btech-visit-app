import { LayoutDashboard } from 'lucide-react'
import { lazy, Suspense, useCallback } from 'react'

import { ErrorState, PageHeader } from '@/components/common'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DashboardFiltersBar,
  DashboardLazySection,
  DashboardQuickActions,
  DashboardTablesSkeleton,
  ExecutiveKpiGrid,
  ExecutiveKpiGridSkeleton,
  ExecutiveSummaryCard,
  DashboardInsightsSkeleton,
  MyPerformanceSection,
  TopBranchesTable,
  TopVisitorsTable,
  createDefaultExecutiveDashboardFilters,
  exportExecutiveDashboardExcel,
  exportExecutiveDashboardPdf,
  useExecutiveDashboard,
} from '@/features/dashboard'
import { useAuth, usePersistedState } from '@/hooks'

const DASHBOARD_FILTERS_KEY = 'btech:dashboard:filters'

const DashboardChartsSection = lazy(async () => {
  const module =
    await import('@/features/dashboard/components/DashboardChartsSection')
  return { default: module.DashboardChartsSection }
})

const VisitorLeaderboard = lazy(async () => {
  const module =
    await import('@/features/dashboard/components/VisitorLeaderboard')
  return { default: module.VisitorLeaderboard }
})

const RecentActivityTimeline = lazy(async () => {
  const module =
    await import('@/features/dashboard/components/RecentActivityTimeline')
  return { default: module.RecentActivityTimeline }
})

const ManagementInsightsPanel = lazy(async () => {
  const module =
    await import('@/features/dashboard/components/ManagementInsightsPanel')
  return { default: module.ManagementInsightsPanel }
})

export function DashboardPage() {
  const { user } = useAuth()
  const [filters, setFilters] = usePersistedState(
    DASHBOARD_FILTERS_KEY,
    createDefaultExecutiveDashboardFilters(),
  )
  const {
    data,
    summary,
    kpis,
    personalPerformance,
    charts,
    tables,
    insights,
    filterOptions,
    isLoading,
    isFetching,
    isError,
    lastUpdatedAt,
    refetch,
  } = useExecutiveDashboard(filters, user?.id)

  const handleReset = useCallback(() => {
    setFilters(createDefaultExecutiveDashboardFilters())
  }, [setFilters])

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

  const handleExportPdf = useCallback(() => {
    if (!data) {
      return
    }

    exportExecutiveDashboardPdf(data, filters)
  }, [data, filters])

  const handleExportExcel = useCallback(() => {
    if (!data) {
      return
    }

    exportExecutiveDashboardExcel(data, filters)
  }, [data, filters])

  const showInitialSkeleton = isLoading && !data
  const sectionLoading = isFetching && !data

  return (
    <div className="page-stack">
      <PageHeader
        title="Executive Dashboard"
        description="Management overview for regional performance, visit activity, and operational coverage."
        icon={LayoutDashboard}
      />

      <DashboardFiltersBar
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        onReset={handleReset}
        onRefresh={handleRefresh}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        isRefreshing={isFetching}
        canExport={Boolean(data)}
      />

      {isError ? (
        <ErrorState
          title="Unable to load dashboard data"
          message="Please try again in a moment."
          onRetry={handleRefresh}
          isRetrying={isFetching}
        />
      ) : null}

      {showInitialSkeleton ? (
        <ExecutiveSummaryCard isLoading />
      ) : (
        <ExecutiveSummaryCard summary={summary} />
      )}

      {showInitialSkeleton ? (
        <ExecutiveKpiGridSkeleton count={10} />
      ) : (
        <ExecutiveKpiGrid
          kpis={kpis}
          lastUpdatedAt={lastUpdatedAt}
          isLoading={sectionLoading}
        />
      )}

      {showInitialSkeleton ? (
        <MyPerformanceSection isLoading />
      ) : (
        <MyPerformanceSection performance={personalPerformance} />
      )}

      <DashboardLazySection
        title="Management Insights"
        description="Automatically generated leadership highlights."
        fallbackHeightClass="h-80"
      >
        {showInitialSkeleton ? (
          <DashboardInsightsSkeleton />
        ) : (
          <Suspense fallback={<DashboardInsightsSkeleton />}>
            <ManagementInsightsPanel insights={insights} />
          </Suspense>
        )}
      </DashboardLazySection>

      <DashboardLazySection
        title="Analytics"
        description="Visit trends, branch performance, and upload activity."
        fallbackHeightClass="h-[720px]"
      >
        {showInitialSkeleton ? (
          <Skeleton className="h-[720px] w-full rounded-xl" />
        ) : (
          <Suspense
            fallback={<Skeleton className="h-[720px] w-full rounded-xl" />}
          >
            <DashboardChartsSection
              charts={charts}
              isLoading={sectionLoading}
            />
          </Suspense>
        )}
      </DashboardLazySection>

      <DashboardLazySection
        title="Leaderboard"
        description="Top performers across visits, coverage, and field activity."
        fallbackHeightClass="h-96"
      >
        {showInitialSkeleton ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <VisitorLeaderboard
              rows={tables?.leaderboard}
              isLoading={sectionLoading}
            />
          </Suspense>
        )}
      </DashboardLazySection>

      {showInitialSkeleton ? (
        <DashboardTablesSkeleton />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <TopVisitorsTable
            rows={tables?.topVisitors ?? []}
            isLoading={sectionLoading}
          />
          <TopBranchesTable
            rows={tables?.mostVisitedBranches ?? []}
            isLoading={sectionLoading}
          />
        </div>
      )}

      <DashboardLazySection
        title="Recent Activity"
        description="Latest submitted visits across the organization."
        fallbackHeightClass="h-96"
      >
        {showInitialSkeleton ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <RecentActivityTimeline
              rows={tables?.recentActivity}
              isLoading={sectionLoading}
            />
          </Suspense>
        )}
      </DashboardLazySection>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Quick Actions
          </h2>
          <p className="text-sm text-muted-foreground">
            Jump to common management workflows.
          </p>
        </div>
        <DashboardQuickActions />
      </section>
    </div>
  )
}
