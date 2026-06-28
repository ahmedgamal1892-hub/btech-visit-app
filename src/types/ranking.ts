export type StoreRankingRecord = {
  brand: string
  category: string
  qty: number
  sales: number
}

export type RankingTableRow = {
  rank: number
  brand: string
  qty: number
  sales: number
  qtyPercent: number
}
