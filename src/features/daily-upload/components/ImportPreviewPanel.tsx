import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ImportPreviewStats } from '@/types/import'

type ImportPreviewPanelProps = {
  preview: ImportPreviewStats | null
}

export function ImportPreviewPanel({ preview }: ImportPreviewPanelProps) {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Import Preview</CardTitle>
        <CardDescription>
          Review the parsed snapshot before replacing the current database
          records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {preview ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PreviewStat label="Display Rows" value={preview.displayRowCount} />
            <PreviewStat label="ACH Rows" value={preview.achRowCount} />
            <PreviewStat label="Stores" value={preview.storeCount} />
            <PreviewStat label="Products" value={preview.productCount} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Upload and validate both Excel files to see the import preview.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
