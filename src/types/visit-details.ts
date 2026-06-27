import type { BranchBrandPerformanceRow } from '@/types/visit'
import type {
  VisitRelatedVisit,
  VisitReviewDecision,
  VisitStatus,
  VisitTimelineEvent,
} from '@/types/visit-status'
import type { VisitProductStatus } from '@/types/visit'

export type VisitDetailsInspectionItem = {
  id: string
  brand: string
  productName: string
  status: VisitProductStatus
  statusLabel: string
  notes: string | null
  displayOrder: number
}

export type VisitDetailsPhoto = {
  id: string
  fileName: string
  storagePath: string
  previewUrl: string
  sortOrder: number
}

export type VisitDetails = {
  visitId: string
  visitNumber: string
  branchName: string
  branchId: string | null
  visitorId: string
  visitorName: string
  visitDate: string
  submittedAt: string | null
  status: VisitStatus
  reviewNotes: string | null
  reviewDecision: VisitReviewDecision | null
  reviewedAt: string | null
  reviewedByName: string | null
  isReadOnly: boolean
  canReview: boolean
  canCreateFollowUp: boolean
  canDelete: boolean
  parentVisitId: string | null
  generalNotes: string | null
  pdfReportReference: string
  performance: BranchBrandPerformanceRow[]
  inspectionItems: VisitDetailsInspectionItem[]
  photos: VisitDetailsPhoto[]
  timeline: VisitTimelineEvent[]
  relatedVisits: VisitRelatedVisit[]
}

export function isVisitNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()

  return message.includes('not found') || message.includes('not available')
}
