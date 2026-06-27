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

function LeaderboardMobileCard({ row }: { row: VisitorLeaderboardRow }) {
  return (
    <article className="min-w-0 rounded-xl border border-border/70 bg-background/60 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium break-words text-foreground">
            {row.visitorName}
          </p>
        </div>
        <Badge
          variant={row.rank <= 3 ? 'default' : 'secondary'}
          className="shrink-0"
        >
          #{row.rank}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Visits</dt>
          <dd className="font-medium tabular-nums">{row.visits}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Branches Covered</dt>
          <dd className="font-medium tabular-nums">{row.branchesCovered}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Products Checked</dt>
          <dd className="font-medium tabular-nums">{row.productsChecked}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Photos Uploaded</dt>
          <dd className="font-medium tabular-nums">{row.photosUploaded}</dd>
        </div>
      </dl>
    </article>
  )
}

export const VisitorLeaderboard = memo(function VisitorLeaderboard({
  rows = [],
  isLoading = false,
}: VisitorLeaderboardProps) {
  if (isLoading) {
    return (
      <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
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
      <div className="min-w-0 p-4 sm:p-5">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No leaderboard data for the current filters.
          </p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {rows.map((row) => (
                <LeaderboardMobileCard key={row.userId} row={row} />
              ))}
            </div>

            <div className="hidden min-w-0 md:block">
              <TableContainer className="min-w-0 max-w-full">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Visitor</TableHead>
                      <TableHead>Visits</TableHead>
                      <TableHead>Branches Covered</TableHead>
                      <TableHead>Products Checked</TableHead>
                      <TableHead className="text-right">
                        Photos Uploaded
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.userId}>
                        <TableCell>
                          <Badge
                            variant={row.rank <= 3 ? 'default' : 'secondary'}
                          >
                            #{row.rank}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.visitorName}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {row.visits}
                        </TableCell>
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
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </>
        )}
      </div>
    </section>
  )
})
