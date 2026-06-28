import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const tableShellClassName =
  'w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm'

const tableScrollClassName =
  'max-h-[560px] w-full min-w-0 max-w-full overflow-y-auto overflow-x-hidden'

const tableClassName =
  'w-full table-fixed text-[12px] md:text-[13px] lg:text-sm'

const headCellClassName =
  'h-10 border-b border-border/50 bg-muted/60 px-2 py-2 text-[11px] font-bold normal-case md:h-11 md:px-3 md:text-xs'

const bodyCellClassName =
  'border-b border-border/40 px-2 py-3.5 align-middle md:px-3 md:py-4'

function RankingTableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <TableRow key={index} className="border-0 bg-card">
          {Array.from({ length: 5 }).map((__, cellIndex) => (
            <TableCell key={cellIndex} className={bodyCellClassName}>
              <Skeleton className="h-4 w-full rounded-md" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function RankingTableSkeleton() {
  return (
    <div className={tableShellClassName}>
      <div className={tableScrollClassName}>
        <Table className={tableClassName}>
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[34%]" />
            <col className="w-[16%]" />
            <col className="w-[24%]" />
            <col className="w-[16%]" />
          </colgroup>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className={headCellClassName}>Rank</TableHead>
              <TableHead className={headCellClassName}>Brand</TableHead>
              <TableHead className={headCellClassName}>Total Qty</TableHead>
              <TableHead className={headCellClassName}>Total Sales</TableHead>
              <TableHead className={cn(headCellClassName, 'text-right')}>
                Share %
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <RankingTableSkeletonRows />
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
