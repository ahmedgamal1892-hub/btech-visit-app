export type ImportBatchStatus = 'confirmed' | 'superseded' | 'failed'

export type ImportBatch = {
  id: string
  uploaded_by: string
  file_name: string
  storage_path: string | null
  status: ImportBatchStatus
  is_current: boolean
  display_row_count: number | null
  ach_row_count: number | null
  ranking_row_count: number | null
  display_hash: string | null
  ach_hash: string | null
  ranking_hash: string | null
  validation_report: Record<string, unknown> | null
  confirmed_at: string | null
  created_at: string
}

export type StorePayload = {
  name: string
  budget_channel?: string | null
}

export type StoreDisplayPayload = {
  store_name: string
  brand: string
  sub_category: string
  item_code: string
  product_name: string
  display_qty: number
}

export type SalesAchievementPayload = {
  store_name: string
  brand: string
  mtd_target: number
  actual_sales: number
  ach_percent: number
}

export type RankingPayload = {
  store_name: string
  brand: string
  category: string
  qty: number
  sales: number
}

export type ImportSheetName = 'display' | 'ach' | 'ranking' | 'general'

export type ImportValidationError = {
  sheet: ImportSheetName
  row?: number
  column?: string
  message: string
}

export type ParsedDisplaySheet = {
  rows: StoreDisplayPayload[]
  budgetChannelsByStore: Record<string, string>
}

export type ParsedAchSheet = {
  rows: SalesAchievementPayload[]
}

export type ParsedRankingSheet = {
  rows: RankingPayload[]
}

export type ParsedSheetResult<T> = {
  sheetStatus: 'found' | 'missing'
  data: T | null
  errors: ImportValidationError[]
}

export type ParsedDailyWorkbook = {
  display: ParsedSheetResult<ParsedDisplaySheet>
  ach: ParsedSheetResult<ParsedAchSheet>
  ranking: ParsedSheetResult<ParsedRankingSheet>
}

export type ImportPreviewStats = {
  displayRowCount: number
  achRowCount: number
  rankingRowCount: number
  storeCount: number
  productCount: number
}

export type ImportSheetSummaryStatus =
  | { state: 'imported'; rowCount: number }
  | { state: 'not_found' }
  | { state: 'skipped' }
  | { state: 'validation_errors'; errorCount: number }

export type ImportSheetSummary = {
  display: ImportSheetSummaryStatus
  ach: ImportSheetSummaryStatus
  ranking: ImportSheetSummaryStatus
}

export type ImportValidationResult = {
  isValid: boolean
  errors: ImportValidationError[]
  preview: ImportPreviewStats | null
  stores: StorePayload[]
  storeDisplay: StoreDisplayPayload[]
  salesAchievement: SalesAchievementPayload[]
  ranking: RankingPayload[]
  importFlags: {
    display: boolean
    ach: boolean
    ranking: boolean
  }
  sheetSummary: ImportSheetSummary | null
}

export type ImportSettings = {
  allowedExtensions: string[]
  maxFileSizeMb: number
}

export type ImportMutationResult =
  | { success: true; batchId: string }
  | { success: false; message: string }

export type DashboardStats = {
  currentSnapshotLabel: string
  totalStores: number
  totalProducts: number
  lastUploadLabel: string
  visitsCount: number
}
