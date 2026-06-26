import { FileText } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type VisitNotesCardProps = {
  notes: string | null
}

export function VisitNotesCard({ notes }: VisitNotesCardProps) {
  const trimmedNotes = notes?.trim()

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4 text-accent" />
          General Notes
        </CardTitle>
        <CardDescription>
          Additional notes captured during the visit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {trimmedNotes ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {trimmedNotes}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No general notes.</p>
        )}
      </CardContent>
    </Card>
  )
}
