import { CheckCircle2, Eye, LayoutDashboard, Plus } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { VisitSubmitSuccessState } from '@/types/visit'

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value))
}

function isVisitSubmitSuccessState(
  value: unknown,
): value is VisitSubmitSuccessState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const state = value as VisitSubmitSuccessState

  return (
    typeof state.visitId === 'string' &&
    typeof state.visitNumber === 'string' &&
    typeof state.submittedAt === 'string' &&
    typeof state.branchName === 'string' &&
    typeof state.visitorName === 'string'
  )
}

export function VisitSubmitSuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = isVisitSubmitSuccessState(location.state)
    ? location.state
    : null

  if (!state) {
    return <Navigate to="/new-visit" replace />
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center py-6 sm:py-10">
      <div className="flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="size-8" aria-hidden="true" />
      </div>

      <h2 className="page-title mt-6 text-center">
        Visit submitted successfully.
      </h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Your visit has been saved and is ready to review.
      </p>

      <Card className="mt-8 w-full rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="text-center sm:text-left">
          <CardTitle className="text-xl">{state.visitNumber}</CardTitle>
          <CardDescription>Visit reference number</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Submitted</dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatSubmittedAt(state.submittedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Branch</dt>
              <dd className="mt-1 font-medium text-foreground">
                {state.branchName}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">Visitor</dt>
              <dd className="mt-1 font-medium text-foreground">
                {state.visitorName}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Button
          type="button"
          className="sm:min-w-40"
          onClick={() => navigate(`/visit-history/${state.visitId}`)}
        >
          <Eye className="size-4" />
          View Visit
        </Button>
        <Button
          type="button"
          variant="outline"
          className="sm:min-w-40"
          onClick={() => navigate('/new-visit')}
        >
          <Plus className="size-4" />
          Start New Visit
        </Button>
        <Button type="button" variant="outline" className="sm:min-w-40" asChild>
          <Link to="/dashboard">
            <LayoutDashboard className="size-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
