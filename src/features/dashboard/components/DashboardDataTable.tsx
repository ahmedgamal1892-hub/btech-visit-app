import { ArrowUpDown, Columns3, Download } from 'lucide-react'
import { memo, useMemo, useState, type ReactNode } from 'react'

import { EmptyState, SearchInput } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SortDirection } from '@/features/dashboard/hooks/use-dashboard-table'
import { downloadCsv } from '@/features/dashboard/utils/export-dashboard'
import { cn } from '@/lib/utils'

export type DashboardTableColumn<T> = {
  id: string
  header: string
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  searchValue?: (row: T) => string
  csvValue?: (row: T) => string | number
  defaultVisible?: boolean
  align?: 'left' | 'right'
}

type DashboardDataTableProps<T> = {
  title: string
  description: string
  rows: T[]
  columns: DashboardTableColumn<T>[]
  rowKey: (row: T) => string
  exportFilename: string
  defaultSortKey: string
  defaultSortDir?: SortDirection
  pageSize?: number
  isLoading?: boolean
  tableState: {
    search: string
    setSearch: (value: string) => void
    sortKey: string
    sortDir: SortDirection
    toggleSort: (key: string) => void
    page: number
    setPage: (page: number) => void
    totalPages: number
    totalCount: number
    pageStart: number
    pageEnd: number
    visibleColumns: Set<string>
    toggleColumn: (columnId: string) => void
    paginatedRows: T[]
    filteredRows: T[]
  }
}

function SortableHeader({
  label,
  columnId,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string
  columnId: string
  sortKey: string
  sortDir: SortDirection
  onSort: (key: string) => void
}) {
  const isActive = sortKey === columnId

  return (
    <button
      type="button"
      className="inline-flex max-w-full items-center gap-1 font-medium hover:text-foreground"
      onClick={() => onSort(columnId)}
    >
      {label}
      <ArrowUpDown
        className={cn(
          'size-3.5 shrink-0',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )}
        aria-hidden="true"
      />
      {isActive ? (
        <span className="sr-only">
          Sorted {sortDir === 'asc' ? 'ascending' : 'descending'}
        </span>
      ) : null}
    </button>
  )
}

function DashboardMobileCard<T>({
  row,
  columns,
}: {
  row: T
  columns: DashboardTableColumn<T>[]
}) {
  return (
    <article className="min-w-0 rounded-xl border border-border/70 bg-background/60 p-4 shadow-sm">
      <dl className="space-y-2 text-sm">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex items-start justify-between gap-3 border-b border-border/50 pb-2 last:border-b-0 last:pb-0"
          >
            <dt className="shrink-0 text-muted-foreground">{column.header}</dt>
            <dd
              className={cn(
                'min-w-0 break-words text-right font-medium text-foreground',
                column.align === 'right' && 'tabular-nums',
              )}
            >
              {column.cell(row)}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

function DashboardDataTableInner<T>({
  title,
  description,
  rows,
  columns,
  rowKey,
  exportFilename,
  isLoading,
  tableState,
}: DashboardDataTableProps<T>) {
  const [showColumns, setShowColumns] = useState(false)

  const visibleColumns = useMemo(
    () => columns.filter((column) => tableState.visibleColumns.has(column.id)),
    [columns, tableState.visibleColumns],
  )

  const handleExport = () => {
    downloadCsv(
      exportFilename,
      visibleColumns.map((column) => column.header),
      tableState.filteredRows.map((row) =>
        visibleColumns.map((column) => column.csvValue?.(row) ?? ''),
      ),
    )
  }

  return (
    <div className="surface-card min-w-0 w-full max-w-full overflow-hidden">
      <div className="border-b border-border/70 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold break-words text-foreground">
              {title}
            </h3>
            <p className="mt-1 text-sm break-words text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end">
            <SearchInput
              value={tableState.search}
              onChange={(event) => tableState.setSearch(event.target.value)}
              placeholder="Search table..."
              className="w-full min-w-0 sm:min-w-[180px] sm:flex-1 md:flex-none"
            />

            <div className="relative w-full min-w-0 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full rounded-full sm:w-auto"
                onClick={() => setShowColumns((current) => !current)}
              >
                <Columns3 className="size-4" aria-hidden="true" />
                Columns
              </Button>

              {showColumns ? (
                <div className="absolute top-full right-0 left-0 z-20 mt-2 max-w-full rounded-xl border border-border/80 bg-card p-3 shadow-lg sm:left-auto sm:min-w-44">
                  {columns.map((column) => (
                    <label
                      key={column.id}
                      className="flex cursor-pointer items-center gap-2 py-1.5 text-sm"
                    >
                      <Checkbox
                        checked={tableState.visibleColumns.has(column.id)}
                        onCheckedChange={() =>
                          tableState.toggleColumn(column.id)
                        }
                      />
                      {column.header}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-full sm:w-auto"
              onClick={handleExport}
              disabled={tableState.filteredRows.length === 0}
            >
              <Download className="size-4" aria-hidden="true" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="min-w-0 p-2 sm:p-4">
        {isLoading ? (
          <div className="space-y-3 p-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No data available"
            description="No records match the current filters."
            className="py-8"
          />
        ) : tableState.filteredRows.length === 0 ? (
          <EmptyState
            title="No matching records"
            description="Try adjusting your search query."
            className="py-8"
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {tableState.paginatedRows.map((row) => (
                <DashboardMobileCard
                  key={rowKey(row)}
                  row={row}
                  columns={visibleColumns}
                />
              ))}
            </div>

            <div className="hidden min-w-0 md:block">
              <TableContainer className="min-w-0 max-w-full">
                <Table className="min-w-[480px]">
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.map((column) => (
                        <TableHead
                          key={column.id}
                          className={cn(
                            column.align === 'right' && 'text-right',
                          )}
                        >
                          {column.sortValue ? (
                            <SortableHeader
                              label={column.header}
                              columnId={column.id}
                              sortKey={tableState.sortKey}
                              sortDir={tableState.sortDir}
                              onSort={tableState.toggleSort}
                            />
                          ) : (
                            column.header
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableState.paginatedRows.map((row) => (
                      <TableRow key={rowKey(row)}>
                        {visibleColumns.map((column) => (
                          <TableCell
                            key={column.id}
                            className={cn(
                              column.align === 'right' && 'text-right',
                            )}
                          >
                            {column.cell(row)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm break-words text-muted-foreground">
                Showing {tableState.pageStart}-{tableState.pageEnd} of{' '}
                {tableState.totalCount}
              </p>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full sm:w-auto"
                  disabled={tableState.page <= 1}
                  onClick={() => tableState.setPage(tableState.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-center text-sm text-muted-foreground sm:text-left">
                  Page {tableState.page} of {tableState.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full sm:w-auto"
                  disabled={tableState.page >= tableState.totalPages}
                  onClick={() => tableState.setPage(tableState.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export const DashboardDataTable = memo(
  DashboardDataTableInner,
) as typeof DashboardDataTableInner
