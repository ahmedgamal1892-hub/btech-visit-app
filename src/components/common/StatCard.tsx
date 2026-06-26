import type { LucideIcon } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    <Card className={cn('rounded-2xl border-border/70 shadow-sm', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <CardDescription className="sr-only">{description}</CardDescription>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-foreground">
          {isLoading ? '...' : value}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
