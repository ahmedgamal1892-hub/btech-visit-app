import type { LucideIcon } from 'lucide-react'
import { memo } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type RankingKpiTone = 'purple' | 'green' | 'blue' | 'orange' | 'teal'

type RankingKpiCardProps = {
  title: string
  value: string
  valueTitle?: string
  subtitle: string
  icon: LucideIcon
  tone: RankingKpiTone
  isLoading?: boolean
}

const toneStyles: Record<
  RankingKpiTone,
  { card: string; icon: string; value: string }
> = {
  purple: {
    card: 'from-[#6C4CF1]/10 via-[#6C4CF1]/5 to-background border-[#6C4CF1]/20',
    icon: 'bg-[#6C4CF1]/15 text-[#6C4CF1]',
    value: 'text-[#6C4CF1]',
  },
  green: {
    card: 'from-emerald-500/10 via-emerald-500/5 to-background border-emerald-500/20',
    icon: 'bg-emerald-500/15 text-emerald-600',
    value: 'text-emerald-600',
  },
  blue: {
    card: 'from-sky-500/10 via-sky-500/5 to-background border-sky-500/20',
    icon: 'bg-sky-500/15 text-sky-600',
    value: 'text-sky-600',
  },
  orange: {
    card: 'from-orange-500/10 via-orange-500/5 to-background border-orange-500/20',
    icon: 'bg-orange-500/15 text-orange-600',
    value: 'text-orange-600',
  },
  teal: {
    card: 'from-teal-500/10 via-teal-500/5 to-background border-teal-500/20',
    icon: 'bg-teal-500/15 text-teal-600',
    value: 'text-teal-600',
  },
}

export const RankingKpiCard = memo(function RankingKpiCard({
  title,
  value,
  valueTitle,
  subtitle,
  icon: Icon,
  tone,
  isLoading = false,
}: RankingKpiCardProps) {
  const styles = toneStyles[tone]

  return (
    <div
      className={cn(
        'group relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
        styles.card,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-20" />
            </>
          ) : (
            <>
              <p
                className={cn(
                  'text-2xl font-bold tracking-tight break-words tabular-nums sm:text-3xl',
                  styles.value,
                )}
                title={valueTitle}
              >
                {value}
              </p>
              <p className="text-xs break-words text-muted-foreground">{subtitle}</p>
            </>
          )}
        </div>
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105',
            styles.icon,
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
})

export function RankingKpiGridSkeleton() {
  return (
    <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="w-full min-w-0 max-w-full rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="size-11 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  )
}
