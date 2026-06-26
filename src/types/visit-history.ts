import type {
  VisitHistoryStatusFilter,
  VisitReviewDecision,
  VisitStatus,
} from '@/types/visit-status'

export type {
  VisitStatus,
  VisitReviewDecision,
  VisitHistoryStatusFilter,
} from '@/types/visit-status'

export type VisitHistorySortBy = 'visit_date' | 'branch' | 'visitor'

export type VisitHistorySortDir = 'asc' | 'desc'

export type VisitHistoryFilters = {
  search: string
  branchId: string
  visitorId: string
  status: VisitHistoryStatusFilter
  fromDate: string
  toDate: string
  sortBy: VisitHistorySortBy
  sortDir: VisitHistorySortDir
  page: number
  pageSize: number
}

export type VisitHistoryRow = {
  visitId: string
  visitNumber: string | null
  visitDate: string
  branchName: string
  branchId: string | null
  visitorId: string
  visitorName: string
  inspectionItemsCount: number
  photosCount: number
  status: VisitStatus
  reviewDecision: VisitReviewDecision | null
}

export type VisitHistoryResult = {
  rows: VisitHistoryRow[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export type VisitSummary = {
  visitId: string
  visitNumber: string
  visitDate: string
  branchName: string
  branchId: string | null
  visitorId: string
  visitorName: string
  status: VisitStatus
  generalNotes: string | null
  pdfReportReference: string
}

export type VisitHistoryVisitorOption = {
  id: string
  name: string
}
