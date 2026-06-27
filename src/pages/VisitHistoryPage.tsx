import { History } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import {
  ErrorState,
  PageHeader,
  PageLoading,
  TablePagination,
} from '@/components/common'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import {
  DeleteVisitDialog,
  type DeleteVisitTarget,
  VisitHistoryFilters,
  VisitHistoryTable,
  VisitHistoryTableSkeleton,
  VISITS_HISTORY_PAGE_SIZE_OPTIONS,
  createDefaultVisitHistoryFilters,
  useVisitHistoryVisitors,
  useVisitsHistory,
} from '@/features/history'
import { useDeleteVisit } from '@/features/history/hooks/use-delete-visit'
import { useBranches } from '@/features/visits'
import { useAuth, useDebouncedValue, usePersistedState } from '@/hooks'
import type {
  VisitHistoryFilters as VisitHistoryFiltersState,
  VisitHistoryRow,
  VisitHistorySortBy,
} from '@/types/visit-history'

const VISIT_HISTORY_FILTERS_KEY = 'btech:visit-history:filters'
const VISIT_HISTORY_SEARCH_KEY = 'btech:visit-history:search'

export function VisitHistoryPage() {
  const { toast } = useToast()
  const { isLoading: isAuthLoading, isAdmin, user } = useAuth()
  const deleteVisitMutation = useDeleteVisit()
  const [deleteTarget, setDeleteTarget] = useState<DeleteVisitTarget | null>(
    null,
  )
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [filters, setFilters] = usePersistedState<
    Omit<VisitHistoryFiltersState, 'search'>
  >(VISIT_HISTORY_FILTERS_KEY, () => {
    const defaults = createDefaultVisitHistoryFilters()
    return {
      branchId: defaults.branchId,
      visitorId: defaults.visitorId,
      status: defaults.status,
      fromDate: defaults.fromDate,
      toDate: defaults.toDate,
      sortBy: defaults.sortBy,
      sortDir: defaults.sortDir,
      page: defaults.page,
      pageSize: defaults.pageSize,
    }
  })
  const [searchInput, setSearchInput] = usePersistedState(
    VISIT_HISTORY_SEARCH_KEY,
    '',
  )
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  const queryFilters = useMemo<VisitHistoryFiltersState>(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch],
  )

  const { data: branches = [], isLoading: isBranchesLoading } = useBranches()
  const { data: visitors = [], isLoading: isVisitorsLoading } =
    useVisitHistoryVisitors(isAdmin)
  const { data, isLoading, isFetching, isError, error, refetch } =
    useVisitsHistory(queryFilters)

  const handleReset = useCallback(() => {
    const defaults = createDefaultVisitHistoryFilters()
    setSearchInput('')
    setFilters({
      branchId: defaults.branchId,
      visitorId: defaults.visitorId,
      status: defaults.status,
      fromDate: defaults.fromDate,
      toDate: defaults.toDate,
      sortBy: defaults.sortBy,
      sortDir: defaults.sortDir,
      page: defaults.page,
      pageSize: defaults.pageSize,
    })
  }, [setFilters, setSearchInput])

  const paginationLabel = useMemo(() => {
    if (!data || data.totalCount === 0) {
      return '0 visits'
    }

    const start = (data.page - 1) * data.pageSize + 1
    const end = Math.min(data.page * data.pageSize, data.totalCount)
    return `${start}-${end} of ${data.totalCount} visits`
  }, [data])

  function handleSort(nextSortBy: VisitHistorySortBy) {
    setFilters((current) => {
      if (current.sortBy === nextSortBy) {
        return {
          ...current,
          sortDir: current.sortDir === 'asc' ? 'desc' : 'asc',
          page: 1,
        }
      }

      return {
        ...current,
        sortBy: nextSortBy,
        sortDir: nextSortBy === 'visit_date' ? 'desc' : 'asc',
        page: 1,
      }
    })
  }

  const canDeleteVisit = useMemo(
    () => (row: VisitHistoryRow) =>
      isAdmin || (user?.id !== undefined && row.visitorId === user.id),
    [isAdmin, user],
  )

  function handleDeleteRequest(row: VisitHistoryRow) {
    setDeleteTarget({
      visitId: row.visitId,
      visitNumber: row.visitNumber,
      branchName: row.branchName,
    })
    setIsDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return
    }

    try {
      await deleteVisitMutation.mutateAsync(deleteTarget.visitId)

      toast({
        variant: 'success',
        title: 'Visit deleted',
        description: 'The visit and related records were removed.',
      })
      setIsDeleteDialogOpen(false)
      setDeleteTarget(null)
    } catch (deleteError) {
      toast({
        variant: 'error',
        title: 'Delete failed',
        description:
          deleteError instanceof Error
            ? deleteError.message
            : 'Unable to delete the visit.',
      })
    }
  }

  if (isAuthLoading) {
    return <PageLoading message="Loading visit history..." />
  }

  const isInitialLoading = isLoading || isBranchesLoading || isVisitorsLoading
  const showSkeleton = isInitialLoading || (isFetching && !data)

  return (
    <div className="page-stack">
      <PageHeader
        title="Visit History"
        description="Browse submitted visits, filter by branch or visitor, and open visit details."
        icon={History}
      />

      <VisitHistoryFilters
        filters={{
          ...filters,
          search: searchInput,
        }}
        branches={branches}
        visitors={visitors}
        showVisitorFilter={isAdmin}
        onReset={handleReset}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
        onChange={(nextFilters) => {
          setSearchInput(nextFilters.search)
          setFilters({
            branchId: nextFilters.branchId,
            visitorId: nextFilters.visitorId,
            status: nextFilters.status,
            fromDate: nextFilters.fromDate,
            toDate: nextFilters.toDate,
            sortBy: nextFilters.sortBy,
            sortDir: nextFilters.sortDir,
            page: 1,
            pageSize: nextFilters.pageSize,
          })
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Submitted Visits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isError ? (
            <ErrorState
              title="Unable to load visit history"
              message={
                error instanceof Error
                  ? error.message
                  : 'Please try again in a moment.'
              }
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          ) : null}

          {!isError && showSkeleton ? <VisitHistoryTableSkeleton /> : null}

          {!isError && !showSkeleton && data ? (
            <>
              <VisitHistoryTable
                rows={data.rows}
                sortBy={filters.sortBy}
                sortDir={filters.sortDir}
                searchQuery={debouncedSearch}
                onSort={handleSort}
                canDeleteVisit={canDeleteVisit}
                onDelete={handleDeleteRequest}
              />

              {data.totalCount > 0 ? (
                <TablePagination
                  label={paginationLabel}
                  page={data.page}
                  totalPages={data.totalPages}
                  pageSize={filters.pageSize}
                  pageSizeOptions={VISITS_HISTORY_PAGE_SIZE_OPTIONS}
                  pageSizeId="visit-history-page-size"
                  onPageChange={(page) =>
                    setFilters((current) => ({ ...current, page }))
                  }
                  onPageSizeChange={(pageSize) =>
                    setFilters((current) => ({ ...current, pageSize, page: 1 }))
                  }
                />
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      <DeleteVisitDialog
        visit={deleteTarget}
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        onConfirm={handleConfirmDelete}
        isSubmitting={deleteVisitMutation.isPending}
      />
    </div>
  )
}
