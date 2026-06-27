import { memo } from 'react'

import type { ExecutiveDashboardCharts } from '@/features/dashboard/types/executive-dashboard.types'

import { DashboardChartCard } from './DashboardCharts'

type DashboardChartsSectionProps = {
  charts?: ExecutiveDashboardCharts
  isLoading?: boolean
}

export const DashboardChartsSection = memo(function DashboardChartsSection({
  charts,
  isLoading = false,
}: DashboardChartsSectionProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <DashboardChartCard
        title="Visits by Day"
        description="Submitted visits over the last 30 days."
        points={charts?.visitsPerDay ?? []}
        variant="bar-vertical"
        isLoading={isLoading}
      />
      <DashboardChartCard
        title="Visits by Week"
        description="Weekly visit volume over the last 12 weeks."
        points={charts?.visitsPerWeek ?? []}
        variant="bar-vertical"
        isLoading={isLoading}
      />
      <DashboardChartCard
        title="Visits by Month"
        description="Monthly visit volume over the last 12 months."
        points={charts?.visitsPerMonth ?? []}
        variant="bar-vertical"
        isLoading={isLoading}
      />
      <DashboardChartCard
        title="Visits by Visitor"
        description="Top contributors in the selected period."
        points={charts?.visitsByVisitor ?? []}
        variant="bar-horizontal"
        isLoading={isLoading}
      />
      <DashboardChartCard
        title="Visits by Branch"
        description="Branches with the highest visit volume."
        points={charts?.visitsByBranch ?? []}
        variant="bar-horizontal"
        isLoading={isLoading}
      />
      <DashboardChartCard
        title="Brand Observations"
        description="Inspection volume grouped by brand."
        points={charts?.brandObservations ?? []}
        variant="bar-horizontal"
        isLoading={isLoading}
      />
      <DashboardChartCard
        title="Photo Upload Trend"
        description="Daily photo uploads over the last 30 days."
        points={charts?.photoUploadTrend ?? []}
        variant="bar-vertical"
        isLoading={isLoading}
      />
    </div>
  )
})
