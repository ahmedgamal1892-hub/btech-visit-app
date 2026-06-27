import { ClipboardList } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'

import {
  ErrorState,
  PageHeader,
  PageLoading,
  TablePagination,
} from '@/components/common'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import {
  AuditLogDetailsDialog,
  AuditLogExportButton,
  AuditLogFilters,
  AuditLogTable,
  AuditLogTableSkeleton,
  AUDIT_LOG_PAGE_SIZE_OPTIONS,
  createDefaultAuditLogFilters,
  exportAuditLogsToExcel,
  useAuditLogFilterOptions,
  useAuditLogs,
} from '@/features/audit'
import { fetchAuditLogs } from '@/services/audit'
import { useAuth, useDebouncedValue, usePersistedState } from '@/hooks'
import type {
  AuditLogEntry,
  AuditLogFilters as AuditLogFiltersState,
} from '@/types/audit'

const AUDIT_LOG_FILTERS_KEY = 'btech:audit-log:filters'
const AUDIT_LOG_SEARCH_KEY = 'btech:audit-log:search'

export function AuditLogPage() {
  const { toast } = useToast()
  const { isLoading: isAuthLoading, isAdmin } = useAuth()
  const [filters, setFilters] = usePersistedState<
    Omit<AuditLogFiltersState, 'search'>
  >(AUDIT_LOG_FILTERS_KEY, () => {
    const defaults = createDefaultAuditLogFilters()
    return {
      actorUserId: defaults.actorUserId,
      action: defaults.action,
      entityType: defaults.entityType,
      fromDate: defaults.fromDate,
      toDate: defaults.toDate,
      page: defaults.page,
      pageSize: defaults.pageSize,
    }
  })
  const [searchInput, setSearchInput] = usePersistedState(
    AUDIT_LOG_SEARCH_KEY,
    '',
  )
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  const queryFilters = useMemo<AuditLogFiltersState>(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch],
  )

  const { data: filterOptions } = useAuditLogFilterOptions()
  const { data, isLoading, isFetching, isError, error, refetch } =
    useAuditLogs(queryFilters)

  const handleReset = useCallback(() => {
    const defaults = createDefaultAuditLogFilters()
    setSearchInput('')
    setFilters({
      actorUserId: defaults.actorUserId,
      action: defaults.action,
      entityType: defaults.entityType,
      fromDate: defaults.fromDate,
      toDate: defaults.toDate,
      page: defaults.page,
      pageSize: defaults.pageSize,
    })
  }, [setFilters, setSearchInput])

  const paginationLabel = useMemo(() => {
    if (!data || data.totalCount === 0) {
      return '0 events'
    }

    const start = (data.page - 1) * data.pageSize + 1
    const end = Math.min(data.page * data.pageSize, data.totalCount)
    return `${start}-${end} of ${data.totalCount} events`
  }, [data])

  if (isAuthLoading) {
    return <PageLoading message="Loading audit log..." />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  const showSkeleton = isLoading || (isFetching && !data)

  async function handleExport() {
    setIsExporting(true)

    try {
      const exportResult = await fetchAuditLogs({
        ...queryFilters,
        page: 1,
        pageSize: 100,
      })

      let allRows = [...exportResult.rows]

      if (exportResult.totalPages > 1) {
        for (let page = 2; page <= exportResult.totalPages; page += 1) {
          const nextPage = await fetchAuditLogs({
            ...queryFilters,
            page,
            pageSize: 100,
          })
          allRows = allRows.concat(nextPage.rows)
        }
      }

      if (allRows.length === 0) {
        toast({
          variant: 'error',
          title: 'Nothing to export',
          description: 'No audit log entries match the current filters.',
        })
        return
      }

      exportAuditLogsToExcel(allRows)
      toast({
        variant: 'success',
        title: 'Export complete',
        description: `${allRows.length} audit log entries exported to Excel.`,
      })
    } catch (exportError) {
      toast({
        variant: 'error',
        title: 'Export failed',
        description:
          exportError instanceof Error
            ? exportError.message
            : 'Unable to export audit logs.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Audit Log"
        description="Review application activity across users, visits, imports, and settings."
        icon={ClipboardList}
        actions={
          <AuditLogExportButton
            isExporting={isExporting}
            onExport={() => void handleExport()}
          />
        }
      />

      <AuditLogFilters
        filters={{
          ...filters,
          search: searchInput,
        }}
        options={filterOptions}
        onReset={handleReset}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
        onChange={(nextFilters) => {
          setSearchInput(nextFilters.search)
          setFilters({
            actorUserId: nextFilters.actorUserId,
            action: nextFilters.action,
            entityType: nextFilters.entityType,
            fromDate: nextFilters.fromDate,
            toDate: nextFilters.toDate,
            page: 1,
            pageSize: nextFilters.pageSize,
          })
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isError ? (
            <ErrorState
              title="Unable to load audit logs"
              message={
                error instanceof Error
                  ? error.message
                  : 'Please try again in a moment.'
              }
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          ) : null}

          {!isError && showSkeleton ? <AuditLogTableSkeleton /> : null}

          {!isError && !showSkeleton && data ? (
            <>
              <AuditLogTable
                rows={data.rows}
                searchQuery={debouncedSearch}
                onSelect={setSelectedEntry}
              />

              {data.totalCount > 0 ? (
                <TablePagination
                  label={paginationLabel}
                  page={data.page}
                  totalPages={data.totalPages}
                  pageSize={filters.pageSize}
                  pageSizeOptions={AUDIT_LOG_PAGE_SIZE_OPTIONS}
                  pageSizeId="audit-log-page-size"
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

      <AuditLogDetailsDialog
        entry={selectedEntry}
        open={Boolean(selectedEntry)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEntry(null)
          }
        }}
      />
    </div>
  )
}
