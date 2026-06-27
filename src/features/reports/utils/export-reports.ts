import * as XLSX from 'xlsx'

import { downloadCsv } from '@/lib/utils/export-file'

export function exportReportCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) {
  downloadCsv(filename, headers, rows)
}

export function exportReportExcel(
  filename: string,
  sheets: Array<{ name: string; rows: Array<Record<string, string | number>> }>,
) {
  const workbook = XLSX.utils.book_new()

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31))
  }

  XLSX.writeFile(workbook, filename)
}

export function printReportSection(sectionId: string) {
  const element = document.getElementById(sectionId)
  if (!element) {
    window.print()
    return
  }

  const printWindow = window.open(
    '',
    '_blank',
    'noopener,noreferrer,width=1024,height=768',
  )
  if (!printWindow) {
    window.print()
    return
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>BTECH Report</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; padding: 24px; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f8f9fb; }
          h1, h2, h3 { margin: 0 0 8px; }
        </style>
      </head>
      <body>${element.innerHTML}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
