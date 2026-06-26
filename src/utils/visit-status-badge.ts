import type { VisitReviewDecision, VisitStatus } from '@/types/visit-status'

export type VisitBadgeDisplay = VisitStatus | 'Needs Follow-up'

export type VisitBadgeProps = {
  label: VisitBadgeDisplay
  className: string
}

export function resolveVisitBadgeDisplay(input: {
  status: VisitStatus
  reviewDecision?: VisitReviewDecision | null
}): VisitBadgeDisplay {
  if (input.reviewDecision === 'needs_follow_up') {
    return 'Needs Follow-up'
  }

  return input.status
}

export function getVisitStatusBadgeProps(
  display: VisitBadgeDisplay,
): VisitBadgeProps {
  switch (display) {
    case 'Draft':
      return {
        label: display,
        className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
      }
    case 'Submitted':
      return {
        label: display,
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
      }
    case 'Reviewed':
      return {
        label: display,
        className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
      }
    case 'Closed':
      return {
        label: display,
        className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
      }
    case 'Needs Follow-up':
      return {
        label: display,
        className: 'bg-red-100 text-red-800 hover:bg-red-100',
      }
    default:
      return {
        label: display,
        className: 'bg-muted text-muted-foreground',
      }
  }
}
