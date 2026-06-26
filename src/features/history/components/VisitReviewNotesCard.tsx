import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type VisitReviewNotesCardProps = {
  reviewNotes: string | null
}

export function VisitReviewNotesCard({
  reviewNotes,
}: VisitReviewNotesCardProps) {
  if (!reviewNotes?.trim()) {
    return null
  }

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Review Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {reviewNotes}
        </p>
      </CardContent>
    </Card>
  )
}
