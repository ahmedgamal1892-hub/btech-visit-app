import { downloadCsv } from '@/lib/utils/export-file'
import type { RankingTableRow } from '@/types/ranking'
import {
  formatAchievementPercent,
  formatNumberWithSeparators,
} from '@/utils/format'

export function exportRankingTableCsv(
  rows: RankingTableRow[],
  storeName: string,
) {
  const sanitizedStoreName = storeName.replace(/[^\w-]+/g, '-').toLowerCase()
  const filename = `ranking-${sanitizedStoreName || 'export'}.csv`

  downloadCsv(
    filename,
    ['Rank', 'Brand', 'Total Qty', 'Total Sales', 'Qty Share %'],
    rows.map((row) => [
      row.rank,
      row.brand,
      row.qty,
      row.sales,
      formatAchievementPercent(row.qtyPercent),
    ]),
  )
}

export function copyRankingTableToClipboard(rows: RankingTableRow[]) {
  const header = ['Rank', 'Brand', 'Total Qty', 'Total Sales', 'Qty Share %']
  const lines = [
    header.join('\t'),
    ...rows.map((row) =>
      [
        row.rank,
        row.brand,
        formatNumberWithSeparators(row.qty),
        formatNumberWithSeparators(row.sales),
        formatAchievementPercent(row.qtyPercent),
      ].join('\t'),
    ),
  ]

  return navigator.clipboard.writeText(lines.join('\n'))
}
