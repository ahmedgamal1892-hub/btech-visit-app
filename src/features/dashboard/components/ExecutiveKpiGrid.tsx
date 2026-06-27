import {
  AlertTriangle,
  Building2,
  Camera,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  MapPin,
  PackageSearch,
  Percent,
} from 'lucide-react'
import { memo } from 'react'

import type { ExecutiveDashboardKpis } from '@/features/dashboard/types/executive-dashboard.types'

import { ExecutiveKpiCard } from './ExecutiveKpiCard'

type ExecutiveKpiGridProps = {
  kpis?: ExecutiveDashboardKpis
  lastUpdatedAt?: number
  isLoading?: boolean
}

export const ExecutiveKpiGrid = memo(function ExecutiveKpiGrid({
  kpis,
  lastUpdatedAt,
  isLoading = false,
}: ExecutiveKpiGridProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 min-[1440px]:grid-cols-4 min-[1440px]:gap-4">
      <ExecutiveKpiCard
        title="Total Branches"
        subtitle="Branches in the current operational snapshot."
        icon={Building2}
        value={kpis?.totalBranches ?? 0}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
      />
      <ExecutiveKpiCard
        title="Visited Branches"
        subtitle="Branches with submitted visits in range."
        icon={MapPin}
        value={kpis?.visitedBranches ?? 0}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
      />
      <ExecutiveKpiCard
        title="Remaining Branches"
        subtitle="Branches not yet visited in range."
        icon={Building2}
        value={kpis?.remainingBranches ?? 0}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
      />
      <ExecutiveKpiCard
        title="Completion %"
        subtitle="Visited branches vs total branches."
        icon={Percent}
        value={`${kpis?.completionPercent ?? 0}%`}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
      />
      <ExecutiveKpiCard
        title="Visits Today"
        subtitle="Submitted visits recorded today."
        icon={CalendarDays}
        value={kpis?.visitsToday ?? 0}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
      />
      <ExecutiveKpiCard
        title="Visits This Week"
        subtitle="Submitted visits in the last 7 days."
        icon={CalendarRange}
        value={kpis?.visitsThisWeek ?? 0}
        trend={kpis?.trends.visitsThisWeek}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
      />
      <ExecutiveKpiCard
        title="Visits This Month"
        subtitle="Submitted visits in the current month."
        icon={ClipboardList}
        value={kpis?.visitsThisMonth ?? 0}
        trend={kpis?.trends.visitsThisMonth}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
      />
      <ExecutiveKpiCard
        title="Products Checked"
        subtitle="Inspection items captured in range."
        icon={PackageSearch}
        value={kpis?.totalProductsChecked ?? 0}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
      />
      <ExecutiveKpiCard
        title="Photos Uploaded"
        subtitle="Visit photos attached in range."
        icon={Camera}
        value={kpis?.totalPhotosUploaded ?? 0}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
      />
      <ExecutiveKpiCard
        title="Open Issues"
        subtitle="Delisted, dead, or damaged product flags."
        icon={AlertTriangle}
        value={kpis?.openIssues ?? 0}
        trend={kpis?.trends.openIssues}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
      />
    </div>
  )
})
