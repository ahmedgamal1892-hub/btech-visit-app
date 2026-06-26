import { ClipboardList } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { VisitDetailsInspectionItem } from '@/types/visit-details'
import { getVisitProductStatusBadgeClassName } from '@/utils/visit-product-status-badge'

type InspectionItemsCardProps = {
  items: VisitDetailsInspectionItem[]
}

function InspectionItemCard({ item }: { item: VisitDetailsInspectionItem }) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Brand
          </dt>
          <dd className="mt-1 font-medium text-foreground">{item.brand}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Product
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {item.productName}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Status
          </dt>
          <dd className="mt-1">
            <Badge
              variant="secondary"
              className={cn(getVisitProductStatusBadgeClassName(item.status))}
            >
              {item.statusLabel}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Notes
          </dt>
          <dd className="mt-1 text-muted-foreground">
            {item.notes?.trim() || '—'}
          </dd>
        </div>
      </dl>
    </article>
  )
}

export function InspectionItemsCard({ items }: InspectionItemsCardProps) {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-4 text-accent" />
          Inspection Items
        </CardTitle>
        <CardDescription>
          Products inspected during this visit and their recorded status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground" role="status">
            No inspection items recorded for this visit.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <InspectionItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
