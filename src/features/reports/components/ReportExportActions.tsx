import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ReportExportActionsProps = {
  onExportPdf: () => void
  onExportExcel: () => void
  onExportCsv: () => void
  onPrint: () => void
  disabled?: boolean
}

export function ReportExportActions({
  onExportPdf,
  onExportExcel,
  onExportCsv,
  onPrint,
  disabled = false,
}: ReportExportActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onExportPdf}
        disabled={disabled}
      >
        <FileText className="size-4" />
        PDF
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onExportExcel}
        disabled={disabled}
      >
        <FileSpreadsheet className="size-4" />
        Excel
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onExportCsv}
        disabled={disabled}
      >
        <Download className="size-4" />
        CSV
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onPrint}
        disabled={disabled}
      >
        <Printer className="size-4" />
        Print
      </Button>
    </div>
  )
}
