import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { VisitReviewDecision, VisitStatus } from '@/types/visit-status'
import {
  getVisitStatusBadgeProps,
  resolveVisitBadgeDisplay,
} from '@/utils/visit-status-badge'

type VisitStatusBadgeProps = {
  status: VisitStatus
  reviewDecision?: VisitReviewDecision | null
  className?: string
}

export function VisitStatusBadge({
  status,
  reviewDecision,
  className,
}: VisitStatusBadgeProps) {
  const display = resolveVisitBadgeDisplay({ status, reviewDecision })
  const badge = getVisitStatusBadgeProps(display)

  return <Badge className={cn(badge.className, className)}>{badge.label}</Badge>
}
