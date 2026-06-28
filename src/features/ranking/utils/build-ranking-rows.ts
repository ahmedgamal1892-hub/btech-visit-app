import type { RankingTableRow, StoreRankingRecord } from '@/types/ranking'

export function buildRankingTableRows(
  records: StoreRankingRecord[],
  categoryFilter: string[],
): RankingTableRow[] {
  const filtered =
    categoryFilter.length > 0
      ? records.filter((record) => categoryFilter.includes(record.category))
      : records

  const byBrand = new Map<string, { qty: number; sales: number }>()

  for (const record of filtered) {
    const existing = byBrand.get(record.brand) ?? { qty: 0, sales: 0 }
    byBrand.set(record.brand, {
      qty: existing.qty + record.qty,
      sales: existing.sales + record.sales,
    })
  }

  const totalQty = [...byBrand.values()].reduce((sum, brand) => sum + brand.qty, 0)

  const rows = [...byBrand.entries()]
    .map(([brand, values]) => ({
      brand,
      qty: values.qty,
      sales: values.sales,
      qtyPercent: totalQty === 0 ? 0 : (values.qty / totalQty) * 100,
    }))
    .sort((left, right) => {
      if (right.qty !== left.qty) {
        return right.qty - left.qty
      }

      return left.brand.localeCompare(right.brand, undefined, {
        sensitivity: 'base',
      })
    })

  return rows.map((row, index) => ({
    rank: index + 1,
    ...row,
  }))
}
