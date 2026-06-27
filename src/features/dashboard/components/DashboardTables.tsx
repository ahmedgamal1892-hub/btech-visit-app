import { memo, useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardDataTable } from '@/features/dashboard/components/DashboardDataTable'
import { useDashboardTable } from '@/features/dashboard/hooks/use-dashboard-table'
import { formatDashboardDate } from '@/features/dashboard/utils/build-executive-dashboard'
import type {
  MostVisitedBranchRow,
  RecentVisitRow,
  TopVisitorRow,
} from '@/features/dashboard/types/executive-dashboard.types'

type TopVisitorsTableProps = {
  rows: TopVisitorRow[]
  isLoading?: boolean
}

export const TopVisitorsTable = memo(function TopVisitorsTable({
  rows,
  isLoading,
}: TopVisitorsTableProps) {
  const columns = useMemo(
    () => [
      {
        id: 'userName',
        header: 'User',
        cell: (row: TopVisitorRow) => (
          <span className="font-medium">{row.userName}</span>
        ),
        sortValue: (row: TopVisitorRow) => row.userName,
        searchValue: (row: TopVisitorRow) => row.userName,
        csvValue: (row: TopVisitorRow) => row.userName,
      },
      {
        id: 'visits',
        header: 'Visits',
        cell: (row: TopVisitorRow) => (
          <span className="tabular-nums">{row.visits}</span>
        ),
        sortValue: (row: TopVisitorRow) => row.visits,
        searchValue: (row: TopVisitorRow) => String(row.visits),
        csvValue: (row: TopVisitorRow) => row.visits,
        align: 'right' as const,
      },
      {
        id: 'lastVisitDate',
        header: 'Last Visit',
        cell: (row: TopVisitorRow) => formatDashboardDate(row.lastVisitDate),
        sortValue: (row: TopVisitorRow) => row.lastVisitDate ?? '',
        searchValue: (row: TopVisitorRow) =>
          formatDashboardDate(row.lastVisitDate),
        csvValue: (row: TopVisitorRow) =>
          formatDashboardDate(row.lastVisitDate),
      },
    ],
    [],
  )

  const tableState = useDashboardTable({
    rows,
    columns,
    defaultSortKey: 'visits',
    pageSize: 8,
  })

  return (
    <DashboardDataTable
      title="Top Visitors"
      description="Most active field users in the selected period."
      rows={rows}
      columns={columns}
      rowKey={(row) => row.userId}
      exportFilename="top-visitors.csv"
      defaultSortKey="visits"
      isLoading={isLoading}
      tableState={tableState}
    />
  )
})

type TopBranchesTableProps = {
  rows: MostVisitedBranchRow[]
  isLoading?: boolean
}

export const TopBranchesTable = memo(function TopBranchesTable({
  rows,
  isLoading,
}: TopBranchesTableProps) {
  const columns = useMemo(
    () => [
      {
        id: 'branchName',
        header: 'Branch',
        cell: (row: MostVisitedBranchRow) => (
          <span className="font-medium">{row.branchName}</span>
        ),
        sortValue: (row: MostVisitedBranchRow) => row.branchName,
        searchValue: (row: MostVisitedBranchRow) => row.branchName,
        csvValue: (row: MostVisitedBranchRow) => row.branchName,
      },
      {
        id: 'visits',
        header: 'Visits',
        cell: (row: MostVisitedBranchRow) => (
          <span className="tabular-nums">{row.visits}</span>
        ),
        sortValue: (row: MostVisitedBranchRow) => row.visits,
        searchValue: (row: MostVisitedBranchRow) => String(row.visits),
        csvValue: (row: MostVisitedBranchRow) => row.visits,
        align: 'right' as const,
      },
    ],
    [],
  )

  const tableState = useDashboardTable({
    rows,
    columns,
    defaultSortKey: 'visits',
    pageSize: 8,
  })

  return (
    <DashboardDataTable
      title="Top Branches"
      description="Branches with the highest visit volume."
      rows={rows}
      columns={columns}
      rowKey={(row) => `${row.branchId ?? row.branchName}`}
      exportFilename="top-branches.csv"
      defaultSortKey="visits"
      isLoading={isLoading}
      tableState={tableState}
    />
  )
})

type RecentVisitsTableProps = {
  rows: RecentVisitRow[]
  isLoading?: boolean
}

export const RecentVisitsTable = memo(function RecentVisitsTable({
  rows,
  isLoading,
}: RecentVisitsTableProps) {
  const columns = useMemo(
    () => [
      {
        id: 'visitDate',
        header: 'Date',
        cell: (row: RecentVisitRow) => formatDashboardDate(row.visitDate),
        sortValue: (row: RecentVisitRow) => row.visitDate,
        searchValue: (row: RecentVisitRow) =>
          formatDashboardDate(row.visitDate),
        csvValue: (row: RecentVisitRow) => formatDashboardDate(row.visitDate),
      },
      {
        id: 'branchName',
        header: 'Branch',
        cell: (row: RecentVisitRow) => (
          <span className="font-medium">{row.branchName}</span>
        ),
        sortValue: (row: RecentVisitRow) => row.branchName,
        searchValue: (row: RecentVisitRow) => row.branchName,
        csvValue: (row: RecentVisitRow) => row.branchName,
      },
      {
        id: 'visitorName',
        header: 'Visitor',
        cell: (row: RecentVisitRow) => row.visitorName,
        sortValue: (row: RecentVisitRow) => row.visitorName,
        searchValue: (row: RecentVisitRow) => row.visitorName,
        csvValue: (row: RecentVisitRow) => row.visitorName,
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row: RecentVisitRow) => (
          <Badge variant="secondary">{row.status}</Badge>
        ),
        sortValue: (row: RecentVisitRow) => row.status,
        searchValue: (row: RecentVisitRow) => row.status,
        csvValue: (row: RecentVisitRow) => row.status,
      },
    ],
    [],
  )

  const tableState = useDashboardTable({
    rows,
    columns,
    defaultSortKey: 'visitDate',
    pageSize: 8,
  })

  return (
    <DashboardDataTable
      title="Recent Visits"
      description="Latest submitted visits in the selected period."
      rows={rows}
      columns={columns}
      rowKey={(row) => row.visitId}
      exportFilename="recent-visits.csv"
      defaultSortKey="visitDate"
      isLoading={isLoading}
      tableState={tableState}
    />
  )
})

export function DashboardTablesSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-full" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((__, rowIndex) => (
              <Skeleton key={rowIndex} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Backward-compatible export alias
export const MostVisitedBranchesTable = TopBranchesTable
