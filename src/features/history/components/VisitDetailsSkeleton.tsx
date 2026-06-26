import { Skeleton } from '@/components/ui/skeleton'

export function VisitDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 p-6 shadow-sm">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/70 p-6 shadow-sm"
        >
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
          <Skeleton className="mt-6 h-32 w-full" />
        </div>
      ))}
    </div>
  )
}
