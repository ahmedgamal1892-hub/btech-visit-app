import { History, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
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
import { useAuth, useDebouncedValue } from '@/hooks'
import type {
  VisitHistoryFilters as VisitHistoryFiltersState,
  VisitHistoryRow,
  VisitHistorySortBy,
} from '@/types/visit-history'

export function VisitHistoryPage() {
  const { toast } = useToast()
  const { isLoading: isAuthLoading, isAdmin, user } = useAuth()
  const deleteVisitMutation = useDeleteVisit()
  const [deleteTarget, setDeleteTarget] = useState<DeleteVisitTarget | null>(
    null,
  )
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [filters, setFilters] = useState<
    Omit<VisitHistoryFiltersState, 'search'>
  >(() => {
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
  const [searchInput, setSearchInput] = useState('')
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
  const { data, isLoading, isFetching, isError, error } =
    useVisitsHistory(queryFilters)

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
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading visit history...
      </div>
    )
  }

  const isInitialLoading = isLoading || isBranchesLoading || isVisitorsLoading
  const showSkeleton = isInitialLoading || (isFetching && !data)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <History className="size-6 text-accent" aria-hidden="true" />
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Visit History
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse submitted visits, filter by branch or visitor, and open visit
          details.
        </p>
      </div>

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Submitted Visits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <VisitHistoryFilters
            filters={{
              ...filters,
              search: searchInput,
            }}
            branches={branches}
            visitors={visitors}
            showVisitorFilter={isAdmin}
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

          {isError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error instanceof Error
                ? error.message
                : 'Unable to load visit history.'}
            </div>
          )}

          {!isError && showSkeleton && <VisitHistoryTableSkeleton />}

          {!isError && !showSkeleton && data && (
            <>
              <VisitHistoryTable
                rows={data.rows}
                sortBy={filters.sortBy}
                sortDir={filters.sortDir}
                onSort={handleSort}
                canDeleteVisit={canDeleteVisit}
                onDelete={handleDeleteRequest}
              />

              <div className="flex flex-col gap-4 border-t border-border/70 pt-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-muted-foreground">
                  {paginationLabel}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="visit-history-page-size"
                      className="sr-only"
                    >
                      Rows per page
                    </Label>
                    <Select
                      id="visit-history-page-size"
                      value={String(filters.pageSize)}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          pageSize: Number(event.target.value),
                          page: 1,
                        }))
                      }
                    >
                      {VISITS_HISTORY_PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size} rows
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={filters.page <= 1}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          page: current.page - 1,
                        }))
                      }
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {data.page} of {data.totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={filters.page >= data.totalPages}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          page: current.page + 1,
                        }))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
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
