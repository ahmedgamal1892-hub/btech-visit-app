import type { LucideIcon } from 'lucide-react'
import { Camera, ClipboardList, MapPin, Percent } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type NewVisitSummaryPanelProps = {
  branchName: string | null
  productsCount: number
  photosCount: number
  completionPercent: number
  className?: string
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0 text-primary" />
        {label}
      </div>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  )
}

export function NewVisitSummaryPanel({
  branchName,
  productsCount,
  photosCount,
  completionPercent,
  className,
}: NewVisitSummaryPanelProps) {
  return (
    <Card
      className={cn(
        'rounded-2xl border-border/70 shadow-sm lg:sticky lg:top-24',
        className,
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Visit Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SummaryRow
          icon={MapPin}
          label="Branch"
          value={branchName ?? 'Not selected'}
        />
        <SummaryRow
          icon={ClipboardList}
          label="Products"
          value={productsCount}
        />
        <SummaryRow icon={Camera} label="Photos" value={photosCount} />

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Percent className="size-4 text-primary" />
              Completion
            </div>
            <span className="text-lg font-bold tabular-nums text-primary">
              {completionPercent}%
            </span>
          </div>
          <Progress value={completionPercent} className="mt-3 h-2" />
        </div>
      </CardContent>
    </Card>
  )
}
