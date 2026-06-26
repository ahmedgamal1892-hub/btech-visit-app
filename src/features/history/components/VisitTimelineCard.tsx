import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { VisitTimelineEvent } from '@/types/visit-status'

type VisitTimelineCardProps = {
  events: VisitTimelineEvent[]
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function formatEventTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
  }).format(new Date(value))
}

export function VisitTimelineCard({ events }: VisitTimelineCardProps) {
  if (events.length === 0) {
    return null
  }

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {events.map((event) => (
            <li
              key={`${event.eventType}-${event.eventAt}`}
              className="flex flex-col gap-1 border-l-2 border-accent/30 pl-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">
                  {event.eventLabel}
                </p>
                <p className="text-sm text-muted-foreground">
                  {event.userName}
                </p>
              </div>
              <div className="text-sm text-muted-foreground sm:text-right">
                <p>{formatEventDate(event.eventAt)}</p>
                <p>{formatEventTime(event.eventAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
