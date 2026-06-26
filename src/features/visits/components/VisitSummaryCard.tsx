import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type VisitSummaryCardProps = {
  visitDateLabel: string
  userLabel: string
  branchLabel: string
}

export function VisitSummaryCard({
  visitDateLabel,
  userLabel,
  branchLabel,
}: VisitSummaryCardProps) {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Visit Information</CardTitle>
        <CardDescription>Details for this store visit session.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Visit Date
            </dt>
            <dd className="text-sm font-medium">{visitDateLabel}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Logged In User
            </dt>
            <dd className="text-sm font-medium">{userLabel}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Selected Branch
            </dt>
            <dd className="text-sm font-medium">{branchLabel}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
