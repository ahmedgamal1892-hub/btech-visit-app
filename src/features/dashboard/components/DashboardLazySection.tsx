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
    <section className="min-w-0 space-y-3 md:space-y-4">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold break-words text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-sm break-words text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <Suspense
        fallback={
          <Skeleton
            className={`w-full min-w-0 rounded-xl ${fallbackHeightClass}`}
          />
        }
      >
        {children}
      </Suspense>
    </section>
  )
}
