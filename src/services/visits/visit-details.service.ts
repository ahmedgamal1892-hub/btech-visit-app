import { getSupabaseClient } from '@/services/supabase/client'
import { createPersistedPhotoPreviewUrl } from '@/services/visits/visit-photo.service'
import type { VisitDetails } from '@/types/visit-details'
import type {
  VisitRelatedVisit,
  VisitReviewDecision,
  VisitStatus,
  VisitTimelineEvent,
  VisitTimelineEventType,
} from '@/types/visit-status'
import type { BranchBrandPerformanceRow } from '@/types/visit'
import { resolveInspectionStatusLabel } from '@/utils/visit-product-status-badge'
import { visitStatusLabelFromDbCode } from '@/types/visit'

type VisitDetailsRpcPerformance = {
  brand: string
  mtd_target: number
  actual_sales: number
  achievement_percent: number
}

type VisitDetailsRpcInspectionItem = {
  id: string
  brand: string
  product_name: string
  status_label: string
  status_code: string
  notes: string | null
  display_order: number
}

type VisitDetailsRpcPhoto = {
  id: string
  storage_path: string
  file_name: string
  sort_order: number
}

type VisitDetailsRpcTimelineEvent = {
  event_type: string
  event_label: string
  user_id: string | null
  user_name: string
  event_at: string
}

type VisitDetailsRpcRelatedVisit = {
  visit_id: string
  visit_number: string | null
  status: string
  review_decision: string | null
  relationship: 'parent' | 'child'
}

type VisitDetailsRpcResponse = {
  visit_id: string
  visit_number: string
  branch_name: string
  branch_id: string | null
  visitor_id: string
  visitor_name: string
  visit_date: string
  submitted_at: string | null
  status: string
  review_notes: string | null
  review_decision: string | null
  reviewed_at: string | null
  reviewed_by_name: string | null
  is_read_only: boolean
  can_review: boolean
  can_create_follow_up: boolean
  parent_visit_id: string | null
  general_notes: string | null
  pdf_report_reference: string
  performance: VisitDetailsRpcPerformance[]
  inspection_items: VisitDetailsRpcInspectionItem[]
  photos: VisitDetailsRpcPhoto[]
  timeline: VisitDetailsRpcTimelineEvent[]
  related_visits: VisitDetailsRpcRelatedVisit[]
}

function mapPerformanceRow(
  row: VisitDetailsRpcPerformance,
): BranchBrandPerformanceRow {
  return {
    brand: row.brand,
    mtdTarget: Number(row.mtd_target),
    actualSales: Number(row.actual_sales),
    achievementPercent: Number(row.achievement_percent),
  }
}

function mapInspectionItem(row: VisitDetailsRpcInspectionItem) {
  const status =
    resolveInspectionStatusLabel(row.status_code) ??
    visitStatusLabelFromDbCode(row.status_code)

  if (!status) {
    throw new Error(`Unknown inspection status "${row.status_label}".`)
  }

  return {
    id: row.id,
    brand: row.brand,
    productName: row.product_name,
    status,
    statusLabel: row.status_label,
    notes: row.notes,
    displayOrder: row.display_order,
  }
}

function mapTimelineEvent(
  event: VisitDetailsRpcTimelineEvent,
): VisitTimelineEvent {
  return {
    eventType: event.event_type as VisitTimelineEventType,
    eventLabel: event.event_label,
    userId: event.user_id,
    userName: event.user_name,
    eventAt: event.event_at,
  }
}

function mapRelatedVisit(
  visit: VisitDetailsRpcRelatedVisit,
): VisitRelatedVisit {
  return {
    visitId: visit.visit_id,
    visitNumber: visit.visit_number,
    status: visit.status as VisitStatus,
    reviewDecision: visit.review_decision as VisitReviewDecision | null,
    relationship: visit.relationship,
  }
}

export async function fetchVisitDetails(
  visitId: string,
): Promise<VisitDetails> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('get_visit_details', {
    p_visit_id: visitId,
  })

  if (error) {
    throw new Error(error.message)
  }

  const payload = data as VisitDetailsRpcResponse

  const photos = await Promise.all(
    (payload.photos ?? []).map(async (photo) => ({
      id: photo.id,
      fileName: photo.file_name,
      storagePath: photo.storage_path,
      previewUrl: await createPersistedPhotoPreviewUrl(photo.storage_path),
      sortOrder: photo.sort_order,
    })),
  )

  return {
    visitId: payload.visit_id,
    visitNumber: payload.visit_number,
    branchName: payload.branch_name,
    branchId: payload.branch_id,
    visitorId: payload.visitor_id,
    visitorName: payload.visitor_name,
    visitDate: payload.visit_date,
    submittedAt: payload.submitted_at,
    status: payload.status as VisitStatus,
    reviewNotes: payload.review_notes,
    reviewDecision: payload.review_decision as VisitReviewDecision | null,
    reviewedAt: payload.reviewed_at,
    reviewedByName: payload.reviewed_by_name,
    isReadOnly: payload.is_read_only,
    canReview: payload.can_review,
    canCreateFollowUp: payload.can_create_follow_up,
    parentVisitId: payload.parent_visit_id,
    generalNotes: payload.general_notes,
    pdfReportReference: payload.pdf_report_reference,
    performance: (payload.performance ?? []).map(mapPerformanceRow),
    inspectionItems: (payload.inspection_items ?? []).map(mapInspectionItem),
    photos,
    timeline: (payload.timeline ?? []).map(mapTimelineEvent),
    relatedVisits: (payload.related_visits ?? []).map(mapRelatedVisit),
  }
}

/** @deprecated Use fetchVisitDetails instead */
export async function fetchVisitSummary(visitId: string) {
  const details = await fetchVisitDetails(visitId)

  return {
    visitId: details.visitId,
    visitNumber: details.visitNumber,
    visitDate: details.visitDate,
    branchName: details.branchName,
    branchId: details.branchId,
    visitorId: details.visitorId,
    visitorName: details.visitorName,
    status: details.status,
    generalNotes: details.generalNotes,
    pdfReportReference: details.pdfReportReference,
  }
}
