import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
  type UIEvent,
} from 'react'

import { EmptyState } from '@/components/common'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type VirtualReportTableProps<T> = {
  rows: T[]
  columns: Array<{
    id: string
    header: string
    cell: (row: T) => ReactNode
    className?: string
  }>
  rowKey: (row: T) => string
  height?: number
  rowHeight?: number
  emptyMessage?: string
}

export function VirtualReportTable<T>({
  rows,
  columns,
  rowKey,
  height = 420,
  rowHeight = 52,
  emptyMessage = 'No rows match the current filters.',
}: VirtualReportTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleCount = Math.ceil(height / rowHeight) + 4
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight))
  const endIndex = Math.min(rows.length, startIndex + visibleCount)
  const offsetY = startIndex * rowHeight

  const visibleRows = useMemo(
    () => rows.slice(startIndex, endIndex),
    [endIndex, rows, startIndex],
  )

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No records found"
        description={emptyMessage}
        className="py-8"
      />
    )
  }

  return (
    <div
      className="overflow-auto rounded-xl border border-border"
      style={{ height }}
      onScroll={onScroll}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {startIndex > 0 ? (
            <TableRow aria-hidden="true">
              <TableCell
                colSpan={columns.length}
                style={{ height: offsetY, padding: 0, border: 0 }}
              />
            </TableRow>
          ) : null}
          {visibleRows.map((row) => (
            <TableRow key={rowKey(row)} style={{ height: rowHeight }}>
              {columns.map((column) => (
                <TableCell key={column.id} className={column.className}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {endIndex < rows.length ? (
            <TableRow aria-hidden="true">
              <TableCell
                colSpan={columns.length}
                style={{
                  height: (rows.length - endIndex) * rowHeight,
                  padding: 0,
                  border: 0,
                }}
              />
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  )
}
