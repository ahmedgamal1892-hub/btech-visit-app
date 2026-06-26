export type VisitStatus = 'Draft' | 'Submitted' | 'Reviewed' | 'Closed'

export type VisitReviewDecision = 'approve' | 'needs_follow_up' | 'close'

export type VisitHistoryStatusFilter = 'all' | VisitStatus | 'needs_follow_up'

export type VisitTimelineEventType =
  | 'created'
  | 'submitted'
  | 'reviewed'
  | 'closed'

export type VisitTimelineEvent = {
  eventType: VisitTimelineEventType
  eventLabel: string
  userId: string | null
  userName: string
  eventAt: string
}

export type VisitRelatedVisit = {
  visitId: string
  visitNumber: string | null
  status: VisitStatus
  reviewDecision: VisitReviewDecision | null
  relationship: 'parent' | 'child'
}

export type VisitReviewInput = {
  visitId: string
  reviewNotes: string
  decision: VisitReviewDecision
}

export type VisitReviewResult = {
  visitId: string
  status: VisitStatus
  reviewDecision: VisitReviewDecision
}
