import { Link2, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { VisitRelatedVisit } from '@/types/visit-status'
import { VisitStatusBadge } from '@/features/history/components/VisitStatusBadge'

type RelatedVisitsCardProps = {
  relatedVisits: VisitRelatedVisit[]
  canCreateFollowUp: boolean
  isCreatingFollowUp: boolean
  onCreateFollowUp: () => void
}

function formatRelatedVisitLabel(visit: VisitRelatedVisit): string {
  if (visit.visitNumber) {
    return visit.relationship === 'child'
      ? `Follow-up Visit ${visit.visitNumber}`
      : visit.visitNumber
  }

  return visit.relationship === 'child'
    ? 'Follow-up Visit (Draft)'
    : 'Parent Visit'
}

export function RelatedVisitsCard({
  relatedVisits,
  canCreateFollowUp,
  isCreatingFollowUp,
  onCreateFollowUp,
}: RelatedVisitsCardProps) {
  if (relatedVisits.length === 0 && !canCreateFollowUp) {
    return null
  }

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-4 text-accent" />
          Related Visits
        </CardTitle>
        {canCreateFollowUp ? (
          <Button
            type="button"
            size="sm"
            onClick={onCreateFollowUp}
            disabled={isCreatingFollowUp}
          >
            <Plus className="size-4" />
            Create Follow-up Visit
          </Button>
        ) : null}
      </CardHeader>
      {relatedVisits.length > 0 ? (
        <CardContent className="space-y-3">
          {relatedVisits.map((visit) => (
            <div
              key={visit.visitId}
              className="flex flex-col gap-2 rounded-xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm text-muted-foreground">
                  {visit.relationship === 'parent'
                    ? 'Parent Visit'
                    : 'Follow-up'}
                </p>
                {visit.status === 'Draft' ? (
                  <p className="font-medium text-foreground">
                    {formatRelatedVisitLabel(visit)}
                  </p>
                ) : (
                  <Link
                    to={`/visit-history/${visit.visitId}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {formatRelatedVisitLabel(visit)}
                  </Link>
                )}
              </div>
              <VisitStatusBadge
                status={visit.status}
                reviewDecision={visit.reviewDecision}
              />
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  )
}
