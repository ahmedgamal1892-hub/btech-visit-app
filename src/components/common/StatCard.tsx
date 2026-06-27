import type { LucideIcon } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type StatCardProps = {
  title: string
  description: string
  icon: LucideIcon
  value?: string | number
  isLoading?: boolean
  className?: string
}

export function StatCard({
  title,
  description,
  icon: Icon,
  value = '—',
  isLoading = false,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'group overflow-hidden border-border/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg',
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <CardDescription className="sr-only">{description}</CardDescription>
        </div>
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-10 w-28" />
        ) : (
          <p className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

export function StatCardGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-11 rounded-xl" />
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
