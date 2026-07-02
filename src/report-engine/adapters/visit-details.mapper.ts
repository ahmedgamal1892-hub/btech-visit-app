import type { VisitDetails } from '@/types/visit-details'
import { LOGO_ALT, LOGO_PATH, PDF_BRANDING } from '@/lib/constants/branding'
import { resolveGeneralNotesHtml } from '@/features/report-preview/utils/general-notes-html'
import {
  getReportCreatedAt,
  getReportReferenceDate,
  getSortedInspectionItems,
  getSortedPhotos,
} from '@/features/report-preview/utils/report-details'
import {
  formatAchievementPercent,
  formatNumberWithSeparators,
  formatPdfDate,
  formatPdfDateTime,
} from '@/utils/format'
import { resolveVisitBadgeDisplay } from '@/utils/visit-status-badge'

import type { ReportViewModel } from '../models/report-view-model'

import {
  mapAchievementTone,
  mapProductStatusTone,
  mapVisitStatusTone,
} from './badge-tone'

export type MapVisitDetailsOptions = {
  generalNotesHtml?: string | null
  generatedAt?: string
  logoSrc?: string
}

function resolveBrandName(details: VisitDetails): string {
  const brands = new Set<string>()

  for (const row of details.performance) {
    brands.add(row.brand)
  }

  for (const item of details.inspectionItems) {
    brands.add(item.brand)
  }

  if (brands.size === 0) {
    return '—'
  }

  if (brands.size === 1) {
    return [...brands][0] ?? '—'
  }

  return 'Multi-Brand'
}

function resolveVisitType(details: VisitDetails): string {
  return details.parentVisitId ? 'Follow-up Visit' : 'Routine Inspection'
}

export function mapVisitDetailsToReportViewModel(
  details: VisitDetails,
  options: MapVisitDetailsOptions = {},
): ReportViewModel {
  const visitStatusLabel = resolveVisitBadgeDisplay({
    status: details.status,
    reviewDecision: details.reviewDecision,
  })

  return {
    appName: PDF_BRANDING.appName,
    tagline: PDF_BRANDING.tagline,
    reportTitle: 'Visit Report',
    logoSrc: options.logoSrc ?? LOGO_PATH,
    logoAlt: LOGO_ALT,
    visitNumber: details.visitNumber,
    visitDate: formatPdfDate(getReportReferenceDate(details)),
    branchName: details.branchName,
    brandName: resolveBrandName(details),
    visitorName: details.visitorName,
    visitType: resolveVisitType(details),
    visitStatus: visitStatusLabel,
    visitStatusTone: mapVisitStatusTone(visitStatusLabel),
    createdDate: formatPdfDateTime(getReportCreatedAt(details)),
    performance: details.performance.map((row) => ({
      brand: row.brand,
      target: formatNumberWithSeparators(row.mtdTarget),
      actual: formatNumberWithSeparators(row.actualSales),
      achievementPercent: formatAchievementPercent(row.achievementPercent),
      achievementTone: mapAchievementTone(row.achievementPercent),
    })),
    inspectionItems: getSortedInspectionItems(details).map((item) => ({
      id: item.id,
      brand: item.brand,
      productName: item.productName,
      status: item.statusLabel,
      statusTone: mapProductStatusTone(item.status),
      notes: item.notes?.trim() || '—',
    })),
    photos: getSortedPhotos(details).map((photo) => ({
      id: photo.id,
      alt: photo.fileName,
      src: photo.previewUrl,
    })),
    generalNotesHtml: resolveGeneralNotesHtml(
      details.generalNotes,
      options.generalNotesHtml,
    ),
    footerText: PDF_BRANDING.footerText,
    generatedAt:
      options.generatedAt ?? formatPdfDateTime(new Date().toISOString()),
  }
}
