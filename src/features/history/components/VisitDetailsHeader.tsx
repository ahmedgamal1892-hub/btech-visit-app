import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { VisitDetails } from '@/types/visit-details'
import { VisitStatusBadge } from '@/features/history/components/VisitStatusBadge'

type VisitDetailsHeaderProps = {
  visit: Pick<
    VisitDetails,
    | 'visitNumber'
    | 'branchName'
    | 'visitorName'
    | 'visitDate'
    | 'submittedAt'
    | 'status'
    | 'reviewDecision'
  >
}

function formatVisitDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(new Date(value))
}

function formatSubmissionTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function VisitDetailsHeader({ visit }: VisitDetailsHeaderProps) {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <VisitStatusBadge
          status={visit.status}
          reviewDecision={visit.reviewDecision}
        />
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-muted-foreground">Visit Number</dt>
            <dd className="mt-1 font-medium">{visit.visitNumber}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Branch Name</dt>
            <dd className="mt-1 font-medium">{visit.branchName}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Visitor Name</dt>
            <dd className="mt-1 font-medium">{visit.visitorName}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Visit Date</dt>
            <dd className="mt-1 font-medium">
              {formatVisitDate(visit.visitDate)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Submission Time</dt>
            <dd className="mt-1 font-medium">
              {visit.submittedAt
                ? formatSubmissionTime(visit.submittedAt)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Visit Status</dt>
            <dd className="mt-1">
              <VisitStatusBadge
                status={visit.status}
                reviewDecision={visit.reviewDecision}
              />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
