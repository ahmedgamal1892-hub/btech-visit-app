import { BRAND_COLORS } from '@/lib/constants/branding'

export const DASHBOARD_CHART_COLORS = [
  BRAND_COLORS.primary,
  '#FF8533',
  '#FFA366',
  '#FFB380',
  '#FFC299',
  '#111827',
  '#374151',
  '#6B7280',
  '#16A34A',
  '#F59E0B',
] as const

export function getChartColor(index: number): string {
  return DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length]
}
