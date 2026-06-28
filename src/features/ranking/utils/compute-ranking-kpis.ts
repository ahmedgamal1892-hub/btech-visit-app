import type { RankingTableRow } from '@/types/ranking'
import type { StoreBranch } from '@/types/visit'

export type RankingKpiMetrics = {
  totalQty: number
  totalSales: number
  averagePrice: number
  activeBrands: number
  storeRank: number | null
  totalStores: number
}

export function computeRankingKpiMetrics(
  rows: RankingTableRow[],
  storeId: string,
  stores: StoreBranch[],
): RankingKpiMetrics {
  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0)
  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0)
  const averagePrice = totalQty === 0 ? 0 : totalSales / totalQty

  const sortedStores = [...stores].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
  )
  const storeRankIndex = sortedStores.findIndex((store) => store.id === storeId)

  return {
    totalQty,
    totalSales,
    averagePrice,
    activeBrands: rows.length,
    storeRank: storeRankIndex >= 0 ? storeRankIndex + 1 : null,
    totalStores: stores.length,
  }
}
