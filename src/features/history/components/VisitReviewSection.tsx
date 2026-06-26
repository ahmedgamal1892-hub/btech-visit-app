import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { VisitReviewDecision, VisitStatus } from '@/types/visit-status'

type VisitReviewSectionProps = {
  visitStatus: VisitStatus
  isSubmitting: boolean
  onSubmit: (input: {
    reviewNotes: string
    decision: VisitReviewDecision
  }) => void
}

export function VisitReviewSection({
  visitStatus,
  isSubmitting,
  onSubmit,
}: VisitReviewSectionProps) {
  const [reviewNotes, setReviewNotes] = useState('')
  const [selectedDecision, setSelectedDecision] =
    useState<VisitReviewDecision | null>(null)

  const decisions: Array<{
    value: VisitReviewDecision
    label: string
    description: string
  }> =
    visitStatus === 'Reviewed'
      ? [
          {
            value: 'close',
            label: 'Close Visit',
            description: 'Mark this visit as closed and read-only.',
          },
        ]
      : [
          {
            value: 'approve',
            label: 'Approve',
            description: 'Mark the visit as reviewed and approved.',
          },
          {
            value: 'needs_follow_up',
            label: 'Needs Follow-up',
            description: 'Requires a follow-up visit to be created.',
          },
          {
            value: 'close',
            label: 'Close Visit',
            description: 'Close the visit without further follow-up.',
          },
        ]

  function handleSubmit() {
    if (!selectedDecision) {
      return
    }

    onSubmit({
      reviewNotes,
      decision: selectedDecision,
    })
  }

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Review</CardTitle>
        <CardDescription>
          Admin review actions for this visit. Closed visits become read-only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="visit-review-notes">Review Notes</Label>
          <Textarea
            id="visit-review-notes"
            value={reviewNotes}
            onChange={(event) => setReviewNotes(event.target.value)}
            placeholder="Add review notes for this visit..."
            rows={4}
          />
        </div>

        <div className="space-y-3">
          <Label>Decision</Label>
          <div className="grid gap-3 md:grid-cols-3">
            {decisions.map((decision) => {
              const isSelected = selectedDecision === decision.value

              return (
                <button
                  key={decision.value}
                  type="button"
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-accent bg-accent/5'
                      : 'border-border/70 hover:border-accent/40'
                  }`}
                  onClick={() => setSelectedDecision(decision.value)}
                >
                  <p className="font-medium text-foreground">
                    {decision.label}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {decision.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedDecision || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting review...
            </>
          ) : (
            'Submit Review'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
