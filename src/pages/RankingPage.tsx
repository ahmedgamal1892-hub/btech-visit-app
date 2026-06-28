import { BarChart3, Clock3, RefreshCw, Store, Trophy } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { EmptyState, ErrorState, PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useDashboardStats } from '@/features/daily-upload/hooks'
import {
  RankingCategoryFilter,
  RankingKpiGrid,
  RankingStoreSelector,
  RankingTable,
  RankingTableSkeleton,
  RankingTableToolbar,
  buildRankingTableRows,
  computeRankingKpiMetrics,
  copyRankingTableToClipboard,
  exportRankingTableCsv,
  useStoreRankingCategories,
  useStoreRankingRecords,
} from '@/features/ranking'
import {
  BranchBrandPerformanceCard,
  useBranchBrandPerformance,
  useBranches,
} from '@/features/visits'
import { cn } from '@/lib/utils'

const rankingCardClassName =
  'w-full min-w-0 max-w-full rounded-2xl border-border/70 shadow-sm'

const rankingAchievementsPanelClassName =
  'ranking-achievements-panel w-full min-w-0 max-w-full overflow-hidden [&_[data-slot=card]]:w-full [&_[data-slot=card]]:min-w-0 [&_[data-slot=card]]:max-w-full [&_[data-slot=card-content]]:min-w-0 [&_[data-slot=card-content]]:max-w-full [&_[data-slot=card-header]]:min-w-0 [&_[data-slot=card-title]]:min-w-0 [&_[data-slot=card-title]]:break-words [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words [&_td]:whitespace-normal [&_th]:whitespace-normal max-sm:[&_table]:text-[11px] max-sm:[&_td]:px-2 max-sm:[&_th]:px-2 max-sm:[&_td]:py-2'

export function RankingPage() {
  const [storeId, setStoreId] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const {
    data: stores = [],
    isLoading: isStoresLoading,
    isError: isStoresError,
    refetch: refetchStores,
  } = useBranches()

  const {
    data: dashboardStats,
    refetch: refetchDashboardStats,
    isFetching: isDashboardStatsFetching,
  } = useDashboardStats()

  const {
    data: brandPerformance = [],
    isLoading: isBrandPerformanceLoading,
    isFetching: isBrandPerformanceFetching,
    refetch: refetchBrandPerformance,
  } = useBranchBrandPerformance(storeId || null)

  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    isFetching: isCategoriesFetching,
    refetch: refetchCategories,
  } = useStoreRankingCategories(storeId || null)

  const {
    data: rankingRecords = [],
    isLoading: isRankingLoading,
    isFetching: isRankingFetching,
    isError: isRankingError,
    refetch: refetchRanking,
  } = useStoreRankingRecords(storeId || null)

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === storeId) ?? null,
    [storeId, stores],
  )

  const rankingRows = useMemo(
    () => buildRankingTableRows(rankingRecords, selectedCategories),
    [rankingRecords, selectedCategories],
  )

  const kpiMetrics = useMemo(
    () => computeRankingKpiMetrics(rankingRows, storeId, stores),
    [rankingRows, storeId, stores],
  )

  const isAchievementsLoading =
    Boolean(storeId) &&
    (isBrandPerformanceLoading || isBrandPerformanceFetching)

  const isCategoryLoading =
    Boolean(storeId) && (isCategoriesLoading || isCategoriesFetching)

  const isTableLoading =
    Boolean(storeId) && (isRankingLoading || isRankingFetching)

  const isKpiLoading = Boolean(storeId) && isTableLoading
  const isRefreshing =
    isStoresLoading ||
    isDashboardStatsFetching ||
    isBrandPerformanceFetching ||
    isCategoriesFetching ||
    isRankingFetching

  const lastUploadLabel =
    dashboardStats?.currentSnapshotLabel ?? 'No snapshot uploaded'

  function handleStoreChange(nextStoreId: string) {
    setStoreId(nextStoreId)
    setSelectedCategories([])
  }

  const handleRefresh = useCallback(() => {
    void refetchStores()
    void refetchDashboardStats()
    if (storeId) {
      void refetchBrandPerformance()
      void refetchCategories()
      void refetchRanking()
    }
  }, [
    refetchBrandPerformance,
    refetchCategories,
    refetchDashboardStats,
    refetchRanking,
    refetchStores,
    storeId,
  ])

  const handleExport = useCallback(() => {
    exportRankingTableCsv(rankingRows, selectedStore?.name ?? 'ranking')
  }, [rankingRows, selectedStore?.name])

  const handleCopy = useCallback(() => {
    void copyRankingTableToClipboard(rankingRows)
  }, [rankingRows])

  if (isStoresError) {
    return (
      <div className="ranking-page page-stack w-full min-w-0 max-w-full overflow-x-hidden">
        <PageHeader
          title="Ranking"
          description="View brand performance ranking by store and category."
          icon={Trophy}
        />
        <ErrorState
          title="Unable to load stores"
          message="The store list could not be loaded."
          onRetry={() => void refetchStores()}
        />
      </div>
    )
  }

  return (
    <div className="ranking-page page-stack w-full min-w-0 max-w-full overflow-x-hidden">
      <PageHeader
        title="Ranking"
        description="View brand performance ranking by store and category."
        icon={Trophy}
        className="min-w-0 max-w-full"
        actions={
          <>
            <div className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-2 text-sm shadow-sm sm:max-w-sm sm:flex-1 lg:w-auto lg:flex-none">
              <Clock3
                className="size-4 shrink-0 text-[#6C4CF1]"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Last Upload
                </p>
                <p className="truncate font-medium text-foreground">
                  {lastUploadLabel}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full min-w-0 sm:w-auto"
            >
              <RefreshCw
                className={isRefreshing ? 'animate-spin' : undefined}
                aria-hidden="true"
              />
              Refresh
            </Button>
          </>
        }
      />

      <Card className={rankingCardClassName}>
        <CardHeader className="min-w-0 pb-3">
          <CardTitle className="text-base">Store</CardTitle>
          <CardDescription className="break-words">
            Select a store to load achievements and ranking data.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 max-w-full">
          <RankingStoreSelector
            stores={stores}
            value={storeId}
            onChange={handleStoreChange}
            isLoading={isStoresLoading}
          />
        </CardContent>
      </Card>

      {!storeId ? (
        <Card className={rankingCardClassName}>
          <CardHeader className="min-w-0 pb-3">
            <CardTitle className="flex min-w-0 items-center gap-2 text-base">
              <BarChart3 className="size-4 shrink-0 text-accent" />
              <span className="min-w-0 break-words">Branch Brand Performance</span>
            </CardTitle>
            <CardDescription className="break-words">
              Month-to-date sales target and achievement by brand for this
              branch.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 max-w-full">
            <p className="text-sm text-muted-foreground" role="status">
              Select a branch to view performance data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={rankingAchievementsPanelClassName}>
          <BranchBrandPerformanceCard
            rows={brandPerformance}
            isLoading={isAchievementsLoading}
          />
        </div>
      )}

      <Card className={rankingCardClassName}>
        <CardHeader className="min-w-0 pb-3">
          <CardTitle className="text-base">Category</CardTitle>
          <CardDescription className="break-words">
            Select one or more categories to filter ranking results, or leave
            empty to combine all categories.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 max-w-full">
          <RankingCategoryFilter
            categories={categories}
            value={selectedCategories}
            onChange={setSelectedCategories}
            disabled={!storeId}
            isLoading={isCategoryLoading}
          />
        </CardContent>
      </Card>

      {!storeId ? (
        <EmptyState
          icon={Store}
          title="Select a Store to view Ranking."
          description="Choose a store above to load KPIs and the brand ranking table."
          className="w-full min-w-0 max-w-full rounded-2xl py-20 shadow-sm"
        />
      ) : (
        <>
          <RankingKpiGrid metrics={kpiMetrics} isLoading={isKpiLoading} />

          <Card className={cn(rankingCardClassName, 'max-md:overflow-x-hidden shadow-sm')}>
            <CardHeader className="flex min-w-0 flex-col gap-3 pb-3 md:flex-row md:items-start md:justify-between md:gap-4 md:pb-4">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base">Ranking by Brand</CardTitle>
                <CardDescription className="break-words">
                  {selectedStore?.name
                    ? `Performance breakdown for ${selectedStore.name}.`
                    : 'Performance breakdown for the selected store.'}
                </CardDescription>
              </div>
              <RankingTableToolbar
                onExport={handleExport}
                onCopy={handleCopy}
                disabled={rankingRows.length === 0}
              />
            </CardHeader>
            <CardContent className="min-w-0 max-w-full px-4 md:px-6">
              {isRankingError ? (
                <ErrorState
                  title="Unable to load ranking"
                  message="Ranking data could not be loaded for this store."
                  onRetry={() => void refetchRanking()}
                />
              ) : null}

              {!isRankingError && isTableLoading ? <RankingTableSkeleton /> : null}

              {!isRankingError && !isTableLoading && rankingRows.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="No ranking data available."
                  description="This store has no ranking records for the current selection."
                  className="w-full min-w-0 max-w-full rounded-2xl border-dashed py-16 shadow-none"
                />
              ) : null}

              {!isRankingError && !isTableLoading && rankingRows.length > 0 ? (
                <RankingTable rows={rankingRows} />
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
