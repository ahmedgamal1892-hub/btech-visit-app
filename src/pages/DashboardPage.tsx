import {
  ClipboardList,
  Loader2,
  Package,
  Store,
  Upload,
  Layers,
} from 'lucide-react'

import { StatCard } from '@/components/common'
import { useDashboardStats } from '@/features/daily-upload/hooks'

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboardStats()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your visit management workspace.
        </p>
      </div>

      {isError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          Unable to load dashboard statistics.
        </div>
      )}

      {isLoading && !data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading dashboard...
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Current Snapshot"
          description="Date of the active operational snapshot."
          icon={Layers}
          value={data?.currentSnapshotLabel}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Stores"
          description="Store count from the current snapshot."
          icon={Store}
          value={data?.totalStores}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Products"
          description="Distinct product count from the current snapshot."
          icon={Package}
          value={data?.totalProducts}
          isLoading={isLoading}
        />
        <StatCard
          title="Last Upload"
          description="Most recent confirmed Excel upload."
          icon={Upload}
          value={data?.lastUploadLabel}
          isLoading={isLoading}
        />
        <StatCard
          title="Visits"
          description="Submitted visit activity summary."
          icon={ClipboardList}
          value={data?.visitsCount}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
