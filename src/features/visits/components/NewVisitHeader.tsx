import { CalendarDays, Clock3, Hash, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type NewVisitHeaderProps = {
  visitNumberLabel: string
  userLabel: string
  visitDateLabel: string
  visitStatus: 'Draft' | 'Ready'
  className?: string
}

function formatCurrentTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
  }).format(date)
}

export function NewVisitHeader({
  visitNumberLabel,
  userLabel,
  visitDateLabel,
  visitStatus,
  className,
}: NewVisitHeaderProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-2xl border-border/70 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm',
        className,
      )}
    >
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              New Store Visit
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {visitNumberLabel}
              </h2>
              <Badge
                variant={visitStatus === 'Ready' ? 'success' : 'secondary'}
                className="rounded-full px-3"
              >
                {visitStatus}
              </Badge>
            </div>
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-background/70 p-4">
            <dt className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <UserRound className="size-3.5" />
              Current User
            </dt>
            <dd className="mt-2 text-sm font-semibold text-foreground">
              {userLabel}
            </dd>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-4">
            <dt className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <CalendarDays className="size-3.5" />
              Visit Date
            </dt>
            <dd className="mt-2 text-sm font-semibold text-foreground">
              {visitDateLabel}
            </dd>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-4">
            <dt className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Clock3 className="size-3.5" />
              Current Time
            </dt>
            <dd className="mt-2 text-sm font-semibold text-foreground">
              {formatCurrentTime(now)}
            </dd>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-4">
            <dt className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Hash className="size-3.5" />
              Visit Status
            </dt>
            <dd className="mt-2 text-sm font-semibold text-foreground">
              {visitStatus === 'Ready'
                ? 'Ready to submit'
                : 'Draft in progress'}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
