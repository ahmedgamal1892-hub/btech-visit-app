import { BarChart3 } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BranchBrandPerformanceTable } from '@/features/visits/components/BranchBrandPerformanceTable'
import type { BranchBrandPerformanceRow } from '@/types/visit'

type BranchPerformanceCardProps = {
  rows: BranchBrandPerformanceRow[]
}

export function BranchPerformanceCard({ rows }: BranchPerformanceCardProps) {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4 text-accent" />
          Branch Performance
        </CardTitle>
        <CardDescription>
          Month-to-date sales target and achievement by brand at the time of
          this visit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground" role="status">
            No achievement data available for this branch.
          </p>
        ) : (
          <BranchBrandPerformanceTable rows={rows} />
        )}
      </CardContent>
    </Card>
  )
}
