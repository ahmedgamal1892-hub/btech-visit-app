import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { BranchBrandPerformanceRow } from '@/types/visit'
import { getAchievementBadgeClassName } from '@/utils/achievement-badge'
import {
  formatAchievementPercent,
  formatNumberWithSeparators,
} from '@/utils/format'

type BranchBrandPerformanceTableProps = {
  rows: BranchBrandPerformanceRow[]
}

export function BranchBrandPerformanceTable({
  rows,
}: BranchBrandPerformanceTableProps) {
  return (
    <Table className="w-full text-xs sm:text-sm">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-9 px-3 whitespace-nowrap normal-case">
            Brand
          </TableHead>
          <TableHead className="h-9 px-3 text-right whitespace-nowrap normal-case">
            Target
          </TableHead>
          <TableHead className="h-9 px-3 text-right whitespace-nowrap normal-case">
            Actual
          </TableHead>
          <TableHead className="h-9 px-3 text-right font-bold whitespace-nowrap normal-case">
            Achievement %
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.brand}
            className="transition-colors hover:bg-muted/40"
          >
            <TableCell className="px-3 py-2.5 font-medium whitespace-nowrap">
              {row.brand}
            </TableCell>
            <TableCell className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
              {formatNumberWithSeparators(row.mtdTarget)}
            </TableCell>
            <TableCell className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
              {formatNumberWithSeparators(row.actualSales)}
            </TableCell>
            <TableCell className="px-3 py-2.5 text-right whitespace-nowrap">
              <Badge
                variant="secondary"
                className={cn(
                  'font-bold tabular-nums',
                  getAchievementBadgeClassName(row.achievementPercent),
                )}
              >
                {formatAchievementPercent(row.achievementPercent)}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
