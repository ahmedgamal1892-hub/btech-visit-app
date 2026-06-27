import {
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Plus,
} from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { PrimaryButton, SecondaryButton } from '@/components/ui/action-buttons'
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
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-8 sm:py-12">
      <div className="animate-in fade-in zoom-in-95 flex size-24 items-center justify-center rounded-full bg-success/10 text-success duration-500">
        <CheckCircle2 className="size-12" aria-hidden="true" />
      </div>

      <h2 className="mt-8 text-center text-3xl font-bold tracking-tight text-foreground">
        Visit Submitted Successfully
      </h2>
      <p className="mt-3 max-w-xl text-center text-sm text-muted-foreground sm:text-base">
        Your visit has been saved and is ready for review in the visit history.
      </p>

      <Card className="mt-8 w-full rounded-2xl border-border/70 shadow-lg">
        <CardHeader className="text-center sm:text-left">
          <CardTitle className="text-2xl text-primary">
            {state.visitNumber}
          </CardTitle>
          <CardDescription>Visit reference number</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
              <dt className="text-sm text-muted-foreground">Branch</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {state.branchName}
              </dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
              <dt className="text-sm text-muted-foreground">Submission Time</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {formatSubmittedAt(state.submittedAt)}
              </dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/15 p-4 sm:col-span-2">
              <dt className="text-sm text-muted-foreground">Visitor</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {state.visitorName}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
        <PrimaryButton
          type="button"
          className="rounded-full"
          onClick={() => navigate('/new-visit')}
        >
          <Plus className="size-4" />
          New Visit
        </PrimaryButton>
        <SecondaryButton
          type="button"
          className="rounded-full"
          onClick={() => navigate('/visit-history')}
        >
          <ClipboardList className="size-4" />
          Visit History
        </SecondaryButton>
        <SecondaryButton type="button" className="rounded-full" asChild>
          <Link to="/dashboard">
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
        </SecondaryButton>
      </div>
    </div>
  )
}
