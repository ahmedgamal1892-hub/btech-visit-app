import {
  Award,
  DollarSign,
  Package,
  PieChart,
  Store,
} from 'lucide-react'

import type { RankingKpiMetrics } from '@/features/ranking/utils/compute-ranking-kpis'
import {
  formatCompactNumber,
  formatNumberWithSeparators,
} from '@/utils/format'

import { RankingKpiCard, RankingKpiGridSkeleton } from './RankingKpiCard'

type RankingKpiGridProps = {
  metrics: RankingKpiMetrics
  isLoading?: boolean
}

export function RankingKpiGrid({ metrics, isLoading = false }: RankingKpiGridProps) {
  if (isLoading) {
    return <RankingKpiGridSkeleton />
  }

  const storeRankValue =
    metrics.storeRank !== null && metrics.totalStores > 0
      ? `${metrics.storeRank} / ${metrics.totalStores}`
      : '—'

  return (
    <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <RankingKpiCard
        title="Total Qty"
        value={formatNumberWithSeparators(metrics.totalQty)}
        subtitle="Units"
        icon={Package}
        tone="purple"
      />
      <RankingKpiCard
        title="Total Sales"
        value={formatCompactNumber(metrics.totalSales)}
        valueTitle={formatNumberWithSeparators(metrics.totalSales)}
        subtitle="EGP"
        icon={DollarSign}
        tone="green"
      />
      <RankingKpiCard
        title="Average Price"
        value={formatCompactNumber(metrics.averagePrice)}
        valueTitle={formatNumberWithSeparators(metrics.averagePrice)}
        subtitle="EGP per Unit"
        icon={PieChart}
        tone="blue"
      />
      <RankingKpiCard
        title="Active Brands"
        value={String(metrics.activeBrands)}
        subtitle="Distinct brands in view"
        icon={Award}
        tone="orange"
      />
      <RankingKpiCard
        title="Store Rank"
        value={storeRankValue}
        subtitle="Within store network"
        icon={Store}
        tone="teal"
      />
    </div>
  )
}
