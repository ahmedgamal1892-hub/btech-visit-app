import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { APP_NAME } from '@/lib/constants/branding'
import type {
  ExecutiveDashboardData,
  ExecutiveDashboardFilters,
} from '../types/executive-dashboard.types'
import { formatDashboardDateTime } from './build-executive-dashboard'

export function exportExecutiveDashboardPdf(
  data: ExecutiveDashboardData,
  filters: ExecutiveDashboardFilters,
  filename?: string,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const exportedAt = new Date().toISOString()
  let cursorY = 16

  doc.setFontSize(18)
  doc.text(`${APP_NAME} - Executive Dashboard`, 14, cursorY)
  cursorY += 8

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Exported ${formatDashboardDateTime(exportedAt)}`, 14, cursorY)
  cursorY += 6
  doc.text(
    `Filters: ${filters.fromDate || 'Any'} to ${filters.toDate || 'Any'}`,
    14,
    cursorY,
  )
  cursorY += 10

  doc.setTextColor(0)
  doc.setFontSize(13)
  doc.text('Executive Summary', 14, cursorY)
  cursorY += 6
  doc.setFontSize(10)
  doc.text(
    `${data.summary.totalBranches} branches | ${data.summary.visitedBranches} visited | ${data.summary.remainingBranches} remaining | ${data.summary.completionPercent}% completion`,
    14,
    cursorY,
  )
  cursorY += 10

  autoTable(doc, {
    startY: cursorY,
    head: [['KPI', 'Value']],
    body: [
      ['Visits Today', String(data.kpis.visitsToday)],
      ['Visits This Week', String(data.kpis.visitsThisWeek)],
      ['Visits This Month', String(data.kpis.visitsThisMonth)],
      ['Products Checked', String(data.kpis.totalProductsChecked)],
      ['Photos Uploaded', String(data.kpis.totalPhotosUploaded)],
      ['Open Issues', String(data.kpis.openIssues)],
    ],
    theme: 'grid',
    styles: { fontSize: 9 },
  })

  cursorY = getAutoTableFinalY(doc, cursorY) + 10

  if (data.personalPerformance) {
    autoTable(doc, {
      startY: cursorY,
      head: [['My Performance', 'Value']],
      body: [
        ['Visits Today', String(data.personalPerformance.visitsToday)],
        ['Visits This Week', String(data.personalPerformance.visitsThisWeek)],
        ['Visits This Month', String(data.personalPerformance.visitsThisMonth)],
        ['Current Rank', `#${data.personalPerformance.currentRank ?? '—'}`],
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
    })

    cursorY = getAutoTableFinalY(doc, cursorY) + 10
  }

  autoTable(doc, {
    startY: cursorY,
    head: [['Insight', 'Value', 'Details']],
    body: data.insights.map((insight) => [
      insight.title,
      insight.value,
      insight.description,
    ]),
    theme: 'grid',
    styles: { fontSize: 8 },
  })

  cursorY = getAutoTableFinalY(doc, cursorY) + 10

  if (cursorY > 240) {
    doc.addPage()
    cursorY = 16
  }

  autoTable(doc, {
    startY: cursorY,
    head: [['Rank', 'Visitor', 'Visits', 'Branches', 'Products', 'Photos']],
    body: data.tables.leaderboard.map((row) => [
      String(row.rank),
      row.visitorName,
      String(row.visits),
      String(row.branchesCovered),
      String(row.productsChecked),
      String(row.photosUploaded),
    ]),
    theme: 'grid',
    styles: { fontSize: 8 },
  })

  doc.save(filename ?? `btech-dashboard-${exportedAt.slice(0, 10)}.pdf`)
}

function getAutoTableFinalY(doc: jsPDF, fallback: number): number {
  const tableMeta = (
    doc as jsPDF & {
      lastAutoTable?: {
        finalY: number
      }
    }
  ).lastAutoTable

  return tableMeta?.finalY ?? fallback
}
