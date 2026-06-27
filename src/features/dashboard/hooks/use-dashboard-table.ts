import { useMemo, useState } from 'react'

import { useDebouncedValue } from '@/hooks/use-debounced-value'

export type SortDirection = 'asc' | 'desc'

export type DashboardTableState<T> = {
  search: string
  debouncedSearch: string
  setSearch: (value: string) => void
  sortKey: string
  sortDir: SortDirection
  toggleSort: (key: string) => void
  page: number
  setPage: (page: number) => void
  pageSize: number
  visibleColumns: Set<string>
  toggleColumn: (columnId: string) => void
  filteredRows: T[]
  paginatedRows: T[]
  totalPages: number
  totalCount: number
  pageStart: number
  pageEnd: number
}

type UseDashboardTableOptions<T> = {
  rows: T[]
  columns: Array<{
    id: string
    sortValue?: (row: T) => string | number
    searchValue?: (row: T) => string
    defaultVisible?: boolean
  }>
  pageSize?: number
  defaultSortKey: string
  defaultSortDir?: SortDirection
}

export function useDashboardTable<T>({
  rows,
  columns,
  pageSize = 8,
  defaultSortKey,
  defaultSortDir = 'desc',
}: UseDashboardTableOptions<T>): DashboardTableState<T> {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDir)
  const [page, setPage] = useState(1)
  const [visibleColumns, setVisibleColumns] = useState(
    () =>
      new Set(
        columns
          .filter((column) => column.defaultVisible !== false)
          .map((column) => column.id),
      ),
  )

  const columnMap = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns],
  )

  const filteredRows = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase()

    const searched = normalizedSearch
      ? rows.filter((row) =>
          columns.some((column) => {
            const value = column.searchValue?.(row)
            return value?.toLowerCase().includes(normalizedSearch)
          }),
        )
      : rows

    const sortColumn = columnMap.get(sortKey)
    if (!sortColumn?.sortValue) {
      return searched
    }

    return [...searched].sort((left, right) => {
      const leftValue = sortColumn.sortValue!(left)
      const rightValue = sortColumn.sortValue!(right)

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortDir === 'asc'
          ? leftValue - rightValue
          : rightValue - leftValue
      }

      return sortDir === 'asc'
        ? String(leftValue).localeCompare(String(rightValue))
        : String(rightValue).localeCompare(String(leftValue))
    })
  }, [columnMap, columns, debouncedSearch, rows, sortDir, sortKey])

  const totalCount = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, totalPages)

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, pageSize, safePage])

  const pageStart = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1
  const pageEnd = Math.min(safePage * pageSize, totalCount)

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(key)
    setSortDir('desc')
    setPage(1)
  }

  const toggleColumn = (columnId: string) => {
    setVisibleColumns((current) => {
      const next = new Set(current)
      if (next.has(columnId)) {
        if (next.size <= 1) {
          return current
        }

        next.delete(columnId)
      } else {
        next.add(columnId)
      }

      return next
    })
  }

  const setSearchValue = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const setPageValue = (nextPage: number) => {
    setPage(Math.max(1, Math.min(nextPage, totalPages)))
  }

  return {
    search,
    debouncedSearch,
    setSearch: setSearchValue,
    sortKey,
    sortDir,
    toggleSort,
    page: safePage,
    setPage: setPageValue,
    pageSize,
    visibleColumns,
    toggleColumn,
    filteredRows,
    paginatedRows,
    totalPages,
    totalCount,
    pageStart,
    pageEnd,
  }
}
