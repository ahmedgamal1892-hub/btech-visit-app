import type { RankingPayload } from '@/types/import'

function rankingRowKey(row: RankingPayload): string {
  return `${row.store_name}::${row.brand}::${row.category}`
}

export function aggregateRankingRows(rows: RankingPayload[]): RankingPayload[] {
  const aggregated = new Map<string, RankingPayload>()

  for (const row of rows) {
    const key = rankingRowKey(row)
    const existing = aggregated.get(key)

    if (existing) {
      aggregated.set(key, {
        ...existing,
        qty: existing.qty + row.qty,
        sales: existing.sales + row.sales,
      })
      continue
    }

    aggregated.set(key, { ...row })
  }

  return Array.from(aggregated.values())
}
