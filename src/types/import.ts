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
  display_hash: string | null
  ach_hash: string | null
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

export type ImportValidationError = {
  sheet: 'display' | 'ach' | 'general'
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

export type ImportPreviewStats = {
  displayRowCount: number
  achRowCount: number
  storeCount: number
  productCount: number
}

export type ImportValidationResult = {
  isValid: boolean
  errors: ImportValidationError[]
  preview: ImportPreviewStats | null
  stores: StorePayload[]
  storeDisplay: StoreDisplayPayload[]
  salesAchievement: SalesAchievementPayload[]
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
