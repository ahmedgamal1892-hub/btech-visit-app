import { CheckCircle2, CircleAlert, CircleX, MinusCircle } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ImportSheetSummary, ImportSheetSummaryStatus } from '@/types/import'

type ImportSummaryPanelProps = {
  summary: ImportSheetSummary
  completedSuccessfully: boolean
}

const STATUS_LABELS: Record<ImportSheetSummaryStatus['state'], string> = {
  imported: 'Imported',
  skipped: 'Skipped',
  not_found: 'Not Found',
  validation_errors: 'Validation Errors',
}

function SheetSummaryLine({
  label,
  status,
}: {
  label: string
  status: ImportSheetSummaryStatus
}) {
  if (status.state === 'imported') {
    return (
      <div className="flex items-start gap-2 text-sm">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {label}{' '}
            <span className="text-muted-foreground">
              · {STATUS_LABELS.imported}
            </span>
          </p>
          <p className="text-muted-foreground">
            {status.rowCount.toLocaleString()} rows imported
          </p>
        </div>
      </div>
    )
  }

  if (status.state === 'skipped') {
    return (
      <div className="flex items-start gap-2 text-sm">
        <MinusCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {label}{' '}
            <span className="text-muted-foreground">
              · {STATUS_LABELS.skipped}
            </span>
          </p>
          <p className="text-muted-foreground">
            Worksheet not in file · existing snapshot kept
          </p>
        </div>
      </div>
    )
  }

  if (status.state === 'not_found') {
    return (
      <div className="flex items-start gap-2 text-sm">
        <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {label}{' '}
            <span className="text-destructive">· {STATUS_LABELS.not_found}</span>
          </p>
          <p className="text-muted-foreground">Worksheet not detected in workbook</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 text-sm">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div className="min-w-0">
        <p className="font-medium text-foreground">
          {label}{' '}
          <span className="text-amber-700">
            · {STATUS_LABELS.validation_errors}
          </span>
        </p>
        <p className="text-muted-foreground">
          {status.errorCount.toLocaleString()} validation issue
          {status.errorCount === 1 ? '' : 's'} · existing snapshot kept
        </p>
      </div>
    </div>
  )
}

export function ImportSummaryPanel({
  summary,
  completedSuccessfully,
}: ImportSummaryPanelProps) {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Import Summary</CardTitle>
        <CardDescription>
          Display, ACH, and Ranking worksheet results for this upload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-4">
          <SheetSummaryLine label="Display" status={summary.display} />
          <SheetSummaryLine label="ACH" status={summary.ach} />
          <SheetSummaryLine label="Ranking" status={summary.ranking} />
        </div>

        {completedSuccessfully ? (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="size-4 shrink-0" />
            Completed Successfully
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
