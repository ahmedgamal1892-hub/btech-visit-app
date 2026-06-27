import { ClipboardList, Package, Store, Upload, Layers } from 'lucide-react'

import {
  AlertBanner,
  PageHeader,
  StatCard,
  StatCardGridSkeleton,
} from '@/components/common'
import { useDashboardStats } from '@/features/daily-upload/hooks'

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboardStats()

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your visit management workspace."
      />

      {isError && (
        <AlertBanner
          variant="error"
          title="Unable to load dashboard statistics"
        >
          Please refresh the page or try again in a moment.
        </AlertBanner>
      )}

      {isLoading && !data ? (
        <StatCardGridSkeleton />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
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
      )}
    </div>
  )
}
