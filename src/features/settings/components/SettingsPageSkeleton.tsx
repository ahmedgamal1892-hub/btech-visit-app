import { Skeleton } from '@/components/ui/skeleton'

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-lg" />
          ))}
        </div>

        <div className="space-y-4">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
