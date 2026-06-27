import { ClipboardList, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
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
import { useAuth, useDebouncedValue } from '@/hooks'
import type {
  AuditLogEntry,
  AuditLogFilters as AuditLogFiltersState,
} from '@/types/audit'

export function AuditLogPage() {
  const { toast } = useToast()
  const { isLoading: isAuthLoading, isAdmin } = useAuth()
  const [filters, setFilters] = useState<Omit<AuditLogFiltersState, 'search'>>(
    () => {
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
    },
  )
  const [searchInput, setSearchInput] = useState('')
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
  const { data, isLoading, isFetching, isError, error } =
    useAuditLogs(queryFilters)

  const paginationLabel = useMemo(() => {
    if (!data || data.totalCount === 0) {
      return '0 events'
    }

    const start = (data.page - 1) * data.pageSize + 1
    const end = Math.min(data.page * data.pageSize, data.totalCount)
    return `${start}-${end} of ${data.totalCount} events`
  }, [data])

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading audit log...
      </div>
    )
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-6 text-accent" aria-hidden="true" />
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Audit Log
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review application activity across users, visits, imports, and
            settings.
          </p>
        </div>

        <AuditLogExportButton
          isExporting={isExporting}
          onExport={() => void handleExport()}
        />
      </div>

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AuditLogFilters
            filters={{
              ...filters,
              search: searchInput,
            }}
            options={filterOptions}
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

          {isError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error instanceof Error
                ? error.message
                : 'Unable to load audit logs.'}
            </div>
          )}

          {!isError && showSkeleton && <AuditLogTableSkeleton />}

          {!isError && !showSkeleton && data && (
            <>
              <AuditLogTable rows={data.rows} onSelect={setSelectedEntry} />

              <div className="flex flex-col gap-4 border-t border-border/70 pt-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-muted-foreground">
                  {paginationLabel}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="audit-log-page-size" className="sr-only">
                      Rows per page
                    </Label>
                    <Select
                      id="audit-log-page-size"
                      value={String(filters.pageSize)}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          pageSize: Number(event.target.value),
                          page: 1,
                        }))
                      }
                    >
                      {AUDIT_LOG_PAGE_SIZE_OPTIONS.map((size) => (
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
