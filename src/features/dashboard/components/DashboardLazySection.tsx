import { Suspense, type ReactNode } from 'react'

import { Skeleton } from '@/components/ui/skeleton'

type DashboardLazySectionProps = {
  title: string
  description?: string
  fallbackHeightClass?: string
  children: ReactNode
}

export function DashboardLazySection({
  title,
  description,
  fallbackHeightClass = 'h-64',
  children,
}: DashboardLazySectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Suspense
        fallback={
          <Skeleton className={`w-full rounded-2xl ${fallbackHeightClass}`} />
        }
      >
        {children}
      </Suspense>
    </section>
  )
}
