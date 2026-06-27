import { downloadCsv, downloadFile } from '@/lib/utils/export-file'

import type {
  ExecutiveDashboardData,
  ExecutiveDashboardFilters,
} from '../types/executive-dashboard.types'

export { downloadCsv }

export function exportExecutiveDashboard(
  data: ExecutiveDashboardData,
  filters: ExecutiveDashboardFilters,
) {
  const exportedAt = new Date().toISOString()
  const payload = {
    exportedAt,
    filters,
    summary: data.summary,
    kpis: data.kpis,
    insights: data.insights,
    charts: data.charts,
    tables: data.tables,
  }

  downloadFile(
    `btech-dashboard-${exportedAt.slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8;',
  )
}
