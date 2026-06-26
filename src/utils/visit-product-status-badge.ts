import type { VisitProductStatus } from '@/types/visit'
import type { PdfBadgeColors } from '@/utils/achievement-badge'
import { visitStatusLabelFromDbCode } from '@/types/visit'

export function getVisitProductStatusPdfColors(
  status: VisitProductStatus,
): PdfBadgeColors {
  switch (status) {
    case 'Sellable':
      return { fill: [209, 250, 229], text: [6, 95, 70] }
    case 'Display':
      return { fill: [219, 234, 254], text: [30, 64, 175] }
    case 'Delisted':
      return { fill: [243, 244, 246], text: [55, 65, 81] }
    case 'Dead':
      return { fill: [254, 226, 226], text: [185, 28, 28] }
    case 'Damaged':
      return { fill: [255, 237, 213], text: [194, 65, 12] }
    default:
      return { fill: [243, 244, 246], text: [55, 65, 81] }
  }
}

export function getVisitProductStatusBadgeClassName(
  status: VisitProductStatus,
): string {
  switch (status) {
    case 'Sellable':
      return 'bg-emerald-100 text-emerald-800'
    case 'Display':
      return 'bg-blue-100 text-blue-800'
    case 'Delisted':
      return 'bg-gray-100 text-gray-700'
    case 'Dead':
      return 'bg-red-100 text-red-800'
    case 'Damaged':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function resolveInspectionStatusLabel(
  statusCode: string,
): VisitProductStatus | null {
  return visitStatusLabelFromDbCode(statusCode)
}
