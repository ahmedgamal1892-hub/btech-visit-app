import { memo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { VisitorLeaderboardRow } from '@/features/dashboard/types/executive-dashboard.types'

type VisitorLeaderboardProps = {
  rows?: VisitorLeaderboardRow[]
  isLoading?: boolean
}

export const VisitorLeaderboard = memo(function VisitorLeaderboard({
  rows = [],
  isLoading = false,
}: VisitorLeaderboardProps) {
  if (isLoading) {
    return (
      <div className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="border-b border-border/70 px-4 py-4 sm:px-5">
        <h2 className="text-lg font-semibold break-words text-foreground">
          Leaderboard
        </h2>
        <p className="mt-1 text-sm break-words text-muted-foreground">
          Top 10 visitors by submitted visit volume in the selected period.
        </p>
      </div>
      <div className="min-w-0 p-2 sm:p-4">
        <TableContainer className="max-w-full">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Visitor</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead>Branches Covered</TableHead>
                <TableHead>Products Checked</TableHead>
                <TableHead className="text-right">Photos Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm">
                    No leaderboard data for the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell>
                      <Badge variant={row.rank <= 3 ? 'default' : 'secondary'}>
                        #{row.rank}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.visitorName}
                    </TableCell>
                    <TableCell className="tabular-nums">{row.visits}</TableCell>
                    <TableCell className="tabular-nums">
                      {row.branchesCovered}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.productsChecked}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.photosUploaded}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </section>
  )
})
