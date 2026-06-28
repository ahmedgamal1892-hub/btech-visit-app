import { getSupabaseClient } from '@/services/supabase/client'
import type {
  DashboardStats,
  ImportBatch,
  ImportMutationResult,
  ImportSettings,
  ImportValidationError,
  RankingPayload,
  SalesAchievementPayload,
  StoreDisplayPayload,
  StorePayload,
} from '@/types/import'

const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
  allowedExtensions: ['xlsx', 'xls'],
  maxFileSizeMb: 10,
}

function nullIfEmptyUuid(value: string | null | undefined): string | null {
  if (value == null || value.trim() === '') {
    return null
  }

  return value
}

export async function fetchImportSettings(): Promise<ImportSettings> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['import.allowed_extensions', 'import.max_file_size_mb'])

  if (error || !data) {
    return DEFAULT_IMPORT_SETTINGS
  }

  const settings = { ...DEFAULT_IMPORT_SETTINGS }

  for (const row of data) {
    if (row.key === 'import.allowed_extensions' && Array.isArray(row.value)) {
      settings.allowedExtensions = row.value.map(String)
    }

    if (row.key === 'import.max_file_size_mb') {
      const parsed = Number(row.value)
      if (Number.isFinite(parsed) && parsed > 0) {
        settings.maxFileSizeMb = parsed
      }
    }
  }

  return settings
}

export async function confirmSnapshotImport(input: {
  uploadedBy: string
  fileName: string
  displayHash: string | null
  achHash: string | null
  rankingHash: string | null
  validationReport: Record<string, unknown>
  stores: StorePayload[]
  storeDisplay: StoreDisplayPayload[]
  salesAchievement: SalesAchievementPayload[]
  ranking: RankingPayload[]
  importFlags: {
    display: boolean
    ach: boolean
    ranking: boolean
  }
}): Promise<ImportMutationResult> {
  const uploadedBy = nullIfEmptyUuid(input.uploadedBy)
  if (!uploadedBy) {
    return {
      success: false,
      message: 'Authenticated user id is required to confirm an import.',
    }
  }

  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('confirm_snapshot_import', {
    p_uploaded_by: uploadedBy,
    p_file_name: input.fileName,
    p_storage_path: null,
    p_display_hash: input.displayHash,
    p_ach_hash: input.achHash,
    p_ranking_hash: input.rankingHash,
    p_validation_report: input.validationReport,
    p_stores: input.stores,
    p_store_display: input.storeDisplay,
    p_sales_achievement: input.salesAchievement,
    p_ranking: input.ranking,
    p_import_display: input.importFlags.display,
    p_import_ach: input.importFlags.ach,
    p_import_ranking: input.importFlags.ranking,
  })

  if (error) {
    return {
      success: false,
      message: error.message,
    }
  }

  const batch = data as ImportBatch

  return {
    success: true,
    batchId: batch.id,
  }
}

export async function logFailedImport(input: {
  uploadedBy: string
  fileName: string
  displayHash?: string | null
  achHash?: string | null
  rankingHash?: string | null
  validationErrors: ImportValidationError[]
  errorLog?: Record<string, unknown>
}): Promise<void> {
  const supabase = getSupabaseClient()
  const uploadedBy = nullIfEmptyUuid(input.uploadedBy)

  if (!uploadedBy) {
    return
  }

  await supabase.rpc('log_failed_import', {
    p_uploaded_by: uploadedBy,
    p_file_name: input.fileName,
    p_storage_path: null,
    p_display_hash: input.displayHash ?? null,
    p_ach_hash: input.achHash ?? null,
    p_validation_report: {
      attempted_at: new Date().toISOString(),
    },
    p_validation_errors: input.validationErrors,
    p_error_log: input.errorLog ?? null,
  })
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabaseClient()

  const [
    currentBatchResult,
    storesResult,
    productsResult,
    lastUploadResult,
    visitsResult,
  ] = await Promise.all([
    supabase.rpc('get_current_import_batch'),
    supabase.from('stores').select('id', { count: 'exact', head: true }),
    supabase.from('store_display').select('item_code'),
    supabase
      .from('import_batches')
      .select('file_name, confirmed_at, created_at')
      .eq('status', 'confirmed')
      .order('confirmed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Submitted'),
  ])

  const currentBatch = currentBatchResult.data as ImportBatch | null
  const productCodes = new Set(
    (productsResult.data ?? []).map((row) => row.item_code),
  )

  const currentSnapshotLabel = currentBatch?.confirmed_at
    ? formatDateTime(currentBatch.confirmed_at)
    : 'No snapshot'

  const lastUpload = lastUploadResult.data
  const lastUploadLabel = lastUpload?.confirmed_at
    ? `${lastUpload.file_name} · ${formatDateTime(lastUpload.confirmed_at)}`
    : 'No uploads yet'

  return {
    currentSnapshotLabel,
    totalStores: storesResult.count ?? 0,
    totalProducts: productCodes.size,
    lastUploadLabel,
    visitsCount: visitsResult.count ?? 0,
  }
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
