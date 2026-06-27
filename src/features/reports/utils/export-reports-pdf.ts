import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { APP_NAME } from '@/lib/constants/branding'

export function exportReportPdf(
  title: string,
  filename: string,
  sections: Array<{ heading: string; rows: Array<[string, string | number]> }>,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  let cursorY = 16

  doc.setFontSize(16)
  doc.text(`${APP_NAME} - ${title}`, 14, cursorY)
  cursorY += 10
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, cursorY)
  cursorY += 8
  doc.setTextColor(0)

  for (const section of sections) {
    if (cursorY > 250) {
      doc.addPage()
      cursorY = 16
    }

    doc.setFontSize(12)
    doc.text(section.heading, 14, cursorY)
    cursorY += 4

    autoTable(doc, {
      startY: cursorY,
      head: [['Metric', 'Value']],
      body: section.rows.map(([label, value]) => [label, String(value)]),
      theme: 'grid',
      styles: { fontSize: 9 },
    })

    cursorY =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? cursorY
    cursorY += 10
  }

  doc.save(filename)
}

export function exportReportTablePdf(
  title: string,
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })

  doc.setFontSize(16)
  doc.text(`${APP_NAME} - ${title}`, 14, 16)
  doc.setFontSize(10)
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 24)

  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: rows.map((row) => row.map(String)),
    theme: 'grid',
    styles: { fontSize: 8 },
  })

  doc.save(filename)
}
