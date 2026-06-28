import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { RankingTableRow } from '@/types/ranking'
import {
  formatAchievementPercent,
  formatCompactNumber,
  formatNumberWithSeparators,
} from '@/utils/format'

import { RankingBrandAvatar } from './RankingBrandAvatar'

type RankingTableProps = {
  rows: RankingTableRow[]
}

const tableShellClassName =
  'w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm'

const tableScrollClassName =
  'max-h-[560px] w-full min-w-0 max-w-full overflow-y-auto overflow-x-hidden'

const tableClassName =
  'w-full table-fixed text-[12px] md:text-[13px] lg:text-sm'

const columnWidths = (
  <colgroup>
    <col className="w-[10%]" />
    <col className="w-[34%]" />
    <col className="w-[16%]" />
    <col className="w-[24%]" />
    <col className="w-[16%]" />
  </colgroup>
)

const headCellClassName =
  'h-10 border-b border-border/50 bg-muted/60 px-2 py-2 text-[11px] font-bold normal-case text-foreground/80 md:h-11 md:px-3 md:text-xs'

const bodyCellClassName =
  'border-b border-border/40 px-2 py-3.5 align-middle md:px-3 md:py-4'

function renderRankBadge(rank: number) {
  if (rank === 1) {
    return (
      <span className="text-base leading-none md:text-xl" aria-label="Rank 1">
        🥇
      </span>
    )
  }

  if (rank === 2) {
    return (
      <span className="text-base leading-none md:text-xl" aria-label="Rank 2">
        🥈
      </span>
    )
  }

  if (rank === 3) {
    return (
      <span className="text-base leading-none md:text-xl" aria-label="Rank 3">
        🥉
      </span>
    )
  }

  return (
    <span className="text-xs font-semibold text-muted-foreground tabular-nums md:text-sm">
      {rank}
    </span>
  )
}

function ProgressBar({
  value,
  maxValue,
  barClassName,
  compact = false,
}: {
  value: number
  maxValue: number
  barClassName: string
  compact?: boolean
}) {
  const widthPercent = maxValue === 0 ? 0 : (Math.abs(value) / maxValue) * 100

  return (
    <div
      className={cn(
        'overflow-hidden rounded-full bg-muted/70',
        compact ? 'h-0.5 md:h-1' : 'h-1 md:h-1.5',
      )}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-300', barClassName)}
        style={{ width: `${Math.min(widthPercent, 100)}%` }}
      />
    </div>
  )
}

function QtyCell({ value, maxValue }: { value: number; maxValue: number }) {
  return (
    <div className="min-w-0 space-y-1 md:space-y-1.5">
      <span className="block text-sm font-semibold tabular-nums text-foreground md:text-base">
        {formatNumberWithSeparators(value)}
      </span>
      <ProgressBar
        value={value}
        maxValue={maxValue}
        barClassName="bg-[#6C4CF1]"
        compact
      />
    </div>
  )
}

function SalesCell({ value, maxValue }: { value: number; maxValue: number }) {
  return (
    <div className="min-w-0 space-y-1 md:space-y-1.5">
      <span
        className="block text-sm font-semibold tabular-nums text-foreground md:text-base"
        title={formatNumberWithSeparators(value)}
      >
        {formatCompactNumber(value)}
      </span>
      <ProgressBar
        value={value}
        maxValue={maxValue}
        barClassName="bg-emerald-500"
        compact
      />
    </div>
  )
}

function ShareCell({ value, maxValue }: { value: number; maxValue: number }) {
  return (
    <div className="min-w-0 space-y-1 text-right md:space-y-1.5">
      <span className="block text-sm font-semibold tabular-nums text-foreground md:text-base">
        {formatAchievementPercent(value)}
      </span>
      <ProgressBar
        value={value}
        maxValue={maxValue}
        barClassName="bg-[#6C4CF1]"
        compact
      />
    </div>
  )
}

export function RankingTable({ rows }: RankingTableProps) {
  const maxQty = Math.max(...rows.map((row) => Math.abs(row.qty)), 0)
  const maxSales = Math.max(...rows.map((row) => Math.abs(row.sales)), 0)
  const maxShare = Math.max(...rows.map((row) => row.qtyPercent), 0)

  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0)
  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0)

  return (
    <div className={tableShellClassName}>
      <div className={tableScrollClassName}>
        <Table className={tableClassName}>
          {columnWidths}
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className={headCellClassName}>
                <span className="md:hidden" aria-hidden="true">
                  🏆
                </span>
                <span className="hidden md:inline">Rank</span>
              </TableHead>
              <TableHead className={headCellClassName}>Brand</TableHead>
              <TableHead className={headCellClassName}>
                <span className="md:hidden">Qty</span>
                <span className="hidden md:inline">Total Qty</span>
              </TableHead>
              <TableHead className={headCellClassName}>
                <span className="md:hidden">Sales</span>
                <span className="hidden md:inline">Total Sales</span>
              </TableHead>
              <TableHead className={cn(headCellClassName, 'text-right')}>
                <span className="md:hidden">Share</span>
                <span className="hidden md:inline">Share %</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.brand}
                className="border-0 bg-card transition-colors md:hover:bg-[#6C4CF1]/5"
              >
                <TableCell className={cn(bodyCellClassName, 'text-center')}>
                  {renderRankBadge(row.rank)}
                </TableCell>
                <TableCell className={bodyCellClassName}>
                  <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                    <RankingBrandAvatar brand={row.brand} />
                    <span className="min-w-0 break-words text-sm font-medium leading-snug text-foreground md:text-[13px]">
                      {row.brand}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={bodyCellClassName}>
                  <QtyCell value={row.qty} maxValue={maxQty} />
                </TableCell>
                <TableCell className={bodyCellClassName}>
                  <SalesCell value={row.sales} maxValue={maxSales} />
                </TableCell>
                <TableCell className={bodyCellClassName}>
                  <ShareCell value={row.qtyPercent} maxValue={maxShare} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <tfoot className="sticky bottom-0 z-10 bg-muted/50 backdrop-blur-sm">
            <TableRow className="border-0 hover:bg-muted/50">
              <TableCell
                className={cn(bodyCellClassName, 'font-bold text-foreground')}
                colSpan={2}
              >
                Total
              </TableCell>
              <TableCell
                className={cn(bodyCellClassName, 'font-bold tabular-nums text-foreground')}
              >
                {formatNumberWithSeparators(totalQty)}
              </TableCell>
              <TableCell
                className={cn(bodyCellClassName, 'font-bold tabular-nums text-foreground')}
                title={formatNumberWithSeparators(totalSales)}
              >
                {formatCompactNumber(totalSales)}
              </TableCell>
              <TableCell
                className={cn(
                  bodyCellClassName,
                  'text-right font-bold tabular-nums text-foreground',
                )}
              >
                100%
              </TableCell>
            </TableRow>
          </tfoot>
        </Table>
      </div>
    </div>
  )
}
