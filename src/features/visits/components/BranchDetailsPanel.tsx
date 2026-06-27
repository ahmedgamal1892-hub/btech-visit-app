import type { LucideIcon } from 'lucide-react'
import { Building2, CalendarDays, MapPin, Package, Tags } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { useBranchLastVisit } from '@/features/visits/hooks/use-branch-last-visit'
import type { StoreBranch } from '@/types/visit'

type BranchDetailsPanelProps = {
  branch: StoreBranch | null
  brandCount: number
  productsCount: number
  isLoadingProducts?: boolean
}

function formatVisitDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function DetailTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: LucideIcon
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:border-primary/20">
      <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

export function BranchDetailsPanel({
  branch,
  brandCount,
  productsCount,
  isLoadingProducts = false,
}: BranchDetailsPanelProps) {
  const { data: lastVisitDate, isLoading: isLastVisitLoading } =
    useBranchLastVisit(branch?.id ?? null)

  if (!branch) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
        Select a branch to view store details and load products.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DetailTile
          label="Store Code"
          value={branch.budget_channel?.trim() || '—'}
          icon={Building2}
        />
        <DetailTile label="Store Name" value={branch.name} icon={MapPin} />
        <DetailTile
          label="Region"
          value={branch.budget_channel?.trim() || '—'}
          icon={MapPin}
        />
        <DetailTile label="Governorate" value="—" icon={MapPin} />
        <DetailTile
          label="Brand Count"
          value={isLoadingProducts ? '…' : String(brandCount)}
          icon={Tags}
        />
        <DetailTile
          label="Products Count"
          value={isLoadingProducts ? '…' : String(productsCount)}
          icon={Package}
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-primary/5 p-4">
        <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <CalendarDays className="size-3.5" />
          Last Visit Date
        </p>
        {isLastVisitLoading ? (
          <Skeleton className="mt-2 h-5 w-32" />
        ) : (
          <p className="mt-2 text-sm font-semibold text-foreground">
            {formatVisitDate(lastVisitDate)}
          </p>
        )}
      </div>
    </div>
  )
}
