import type { VisitDetails } from '@/types/visit-details'

export function getReportCreatedAt(details: VisitDetails): string {
  const createdEvent = details.timeline.find(
    (event) => event.eventType === 'created',
  )

  return createdEvent?.eventAt ?? details.visitDate
}

export function getReportReferenceDate(details: VisitDetails): string {
  return details.visitDate
}

export function getReportReferenceTime(details: VisitDetails): string {
  return details.submittedAt ?? details.visitDate
}

export function getSortedInspectionItems(details: VisitDetails) {
  return [...details.inspectionItems].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  )
}

export function getSortedPhotos(details: VisitDetails) {
  return [...details.photos].sort((left, right) => left.sortOrder - right.sortOrder)
}
