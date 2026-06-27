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
    <div className="dashboard-page page-stack">
      <PageHeader
        title="Executive Dashboard"
        description="Management overview for regional performance, visit activity, and operational coverage."
        icon={LayoutDashboard}
        className="min-w-0 [&_h1]:break-words [&_p]:break-words"
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
        fallbackHeightClass="h-[28rem] md:h-[720px]"
      >
        {showInitialSkeleton ? (
          <Skeleton className="h-[28rem] w-full min-w-0 rounded-xl md:h-[720px]" />
        ) : (
          <Suspense
            fallback={
              <Skeleton className="h-[28rem] w-full min-w-0 rounded-xl md:h-[720px]" />
            }
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
          <Skeleton className="h-72 w-full min-w-0 rounded-xl md:h-96" />
        ) : (
          <Suspense
            fallback={
              <Skeleton className="h-72 w-full min-w-0 rounded-xl md:h-96" />
            }
          >
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
        <div className="grid min-w-0 grid-cols-1 gap-4 md:gap-5 min-[1440px]:grid-cols-2 min-[1440px]:gap-5">
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
          <Skeleton className="h-72 w-full min-w-0 rounded-xl md:h-96" />
        ) : (
          <Suspense
            fallback={
              <Skeleton className="h-72 w-full min-w-0 rounded-xl md:h-96" />
            }
          >
            <RecentActivityTimeline
              rows={tables?.recentActivity}
              isLoading={sectionLoading}
            />
          </Suspense>
        )}
      </DashboardLazySection>

      <section className="min-w-0 space-y-3 md:space-y-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold break-words text-foreground">
            Quick Actions
          </h2>
          <p className="text-sm break-words text-muted-foreground">
            Jump to common management workflows.
          </p>
        </div>
        <DashboardQuickActions />
      </section>
    </div>
  )
}
