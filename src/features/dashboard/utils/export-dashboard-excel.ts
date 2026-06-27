import * as XLSX from 'xlsx'

import type {
  ExecutiveDashboardData,
  ExecutiveDashboardFilters,
} from '../types/executive-dashboard.types'
import { formatDashboardDateTime } from './build-executive-dashboard'

export function exportExecutiveDashboardExcel(
  data: ExecutiveDashboardData,
  filters: ExecutiveDashboardFilters,
  filename?: string,
): void {
  const exportedAt = new Date().toISOString()
  const workbook = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.json_to_sheet([
    { Metric: 'Exported At', Value: formatDashboardDateTime(exportedAt) },
    { Metric: 'From Date', Value: filters.fromDate || 'Any' },
    { Metric: 'To Date', Value: filters.toDate || 'Any' },
    { Metric: 'Total Branches', Value: data.summary.totalBranches },
    { Metric: 'Visited Branches', Value: data.summary.visitedBranches },
    { Metric: 'Remaining Branches', Value: data.summary.remainingBranches },
    {
      Metric: 'Completion %',
      Value: `${data.summary.completionPercent}%`,
    },
    { Metric: 'Visits Today', Value: data.kpis.visitsToday },
    { Metric: 'Visits This Week', Value: data.kpis.visitsThisWeek },
    { Metric: 'Visits This Month', Value: data.kpis.visitsThisMonth },
    { Metric: 'Products Checked', Value: data.kpis.totalProductsChecked },
    { Metric: 'Photos Uploaded', Value: data.kpis.totalPhotosUploaded },
    { Metric: 'Open Issues', Value: data.kpis.openIssues },
  ])
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  if (data.personalPerformance) {
    const personalSheet = XLSX.utils.json_to_sheet([
      {
        Metric: 'Visits Today',
        Value: data.personalPerformance.visitsToday,
      },
      {
        Metric: 'Visits This Week',
        Value: data.personalPerformance.visitsThisWeek,
      },
      {
        Metric: 'Visits This Month',
        Value: data.personalPerformance.visitsThisMonth,
      },
      {
        Metric: 'Last Visit',
        Value: formatDashboardDateTime(data.personalPerformance.lastVisitDate),
      },
      {
        Metric: 'Last Branch',
        Value: data.personalPerformance.lastBranchVisited ?? '—',
      },
      {
        Metric: 'Photos Uploaded',
        Value: data.personalPerformance.totalPhotosUploaded,
      },
      {
        Metric: 'Products Checked',
        Value: data.personalPerformance.totalProductsChecked,
      },
      {
        Metric: 'Average Duration',
        Value: data.personalPerformance.averageVisitDurationLabel,
      },
      {
        Metric: 'Current Rank',
        Value: data.personalPerformance.currentRank ?? '—',
      },
    ])
    XLSX.utils.book_append_sheet(workbook, personalSheet, 'My Performance')
  }

  const insightsSheet = XLSX.utils.json_to_sheet(
    data.insights.map((insight) => ({
      Title: insight.title,
      Value: insight.value,
      Description: insight.description,
    })),
  )
  XLSX.utils.book_append_sheet(workbook, insightsSheet, 'Insights')

  const leaderboardSheet = XLSX.utils.json_to_sheet(
    data.tables.leaderboard.map((row) => ({
      Rank: row.rank,
      Visitor: row.visitorName,
      Visits: row.visits,
      'Branches Covered': row.branchesCovered,
      'Products Checked': row.productsChecked,
      'Photos Uploaded': row.photosUploaded,
    })),
  )
  XLSX.utils.book_append_sheet(workbook, leaderboardSheet, 'Leaderboard')

  const activitySheet = XLSX.utils.json_to_sheet(
    data.tables.recentActivity.map((row) => ({
      Visitor: row.visitorName,
      Branch: row.branchName,
      'Visit Time': formatDashboardDateTime(row.visitTime),
      Status: row.status,
      'Photo Count': row.photoCount,
    })),
  )
  XLSX.utils.book_append_sheet(workbook, activitySheet, 'Recent Activity')

  XLSX.writeFile(
    workbook,
    filename ?? `btech-dashboard-${exportedAt.slice(0, 10)}.xlsx`,
  )
}
