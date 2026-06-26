import { BarChart3 } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BranchBrandPerformanceTable } from '@/features/visits/components/BranchBrandPerformanceTable'
import type { BranchBrandPerformanceRow } from '@/types/visit'

type BranchBrandPerformanceCardProps = {
  rows: BranchBrandPerformanceRow[]
  isLoading: boolean
  embedded?: boolean
}

function PerformanceTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  )
}

export function BranchBrandPerformanceCard({
  rows,
  isLoading,
  embedded = false,
}: BranchBrandPerformanceCardProps) {
  const content = (
    <>
      {isLoading ? <PerformanceTableSkeleton /> : null}

      {!isLoading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground" role="status">
          No achievement data available for this branch.
        </p>
      ) : null}

      {!isLoading && rows.length > 0 ? (
        <BranchBrandPerformanceTable rows={rows} />
      ) : null}
    </>
  )

  if (embedded) {
    return content
  }

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4 text-accent" />
          Branch Brand Performance
        </CardTitle>
        <CardDescription>
          Month-to-date sales target and achievement by brand for this branch.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
