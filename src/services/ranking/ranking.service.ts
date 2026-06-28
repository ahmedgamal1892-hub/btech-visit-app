import { getSupabaseClient } from '@/services/supabase/client'
import type { StoreRankingRecord } from '@/types/ranking'

const STORE_RANKING_SELECT = 'brand, category, qty, sales'

export async function loadStoreRankingCategories(
  storeId: string,
): Promise<string[]> {
  const supabase = getSupabaseClient()
  const resolvedStoreId = await resolveStoreIdForRanking(supabase, storeId)

  const { data, error } = await supabase
    .from('store_ranking')
    .select('category')
    .eq('store_id', resolvedStoreId)

  if (error) {
    throw new Error(error.message)
  }

  return [...new Set((data ?? []).map((row) => String(row.category)))]
    .filter((category) => category.trim().length > 0)
    .sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' }),
    )
}

export async function loadStoreRankingRecords(
  storeId: string,
): Promise<StoreRankingRecord[]> {
  const supabase = getSupabaseClient()
  const resolvedStoreId = await resolveStoreIdForRanking(supabase, storeId)

  const { data, error } = await supabase
    .from('store_ranking')
    .select(STORE_RANKING_SELECT)
    .eq('store_id', resolvedStoreId)
    .order('category', { ascending: true })
    .order('brand', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    brand: String(row.brand),
    category: String(row.category),
    qty: Number(row.qty),
    sales: Number(row.sales),
  }))
}

async function resolveStoreIdForRanking(
  supabase: ReturnType<typeof getSupabaseClient>,
  storeId: string,
): Promise<string> {
  const hasDirectRanking = await storeHasRankingRows(supabase, storeId)
  if (hasDirectRanking) {
    return storeId
  }

  const { data: branch, error: branchError } = await supabase
    .from('stores')
    .select('id, name, batch_id')
    .eq('id', storeId)
    .maybeSingle()

  if (branchError) {
    throw new Error(branchError.message)
  }

  if (!branch?.name) {
    return storeId
  }

  const { data: siblings, error: siblingsError } = await supabase
    .from('stores')
    .select('id, batch_id, created_at')
    .eq('name', branch.name)
    .order('created_at', { ascending: false })

  if (siblingsError) {
    throw new Error(siblingsError.message)
  }

  const siblingIds = (siblings ?? []).map((row) => row.id)
  if (siblingIds.length === 0) {
    return storeId
  }

  const { data: rankingRows, error: rankingError } = await supabase
    .from('store_ranking')
    .select('store_id')
    .in('store_id', siblingIds)

  if (rankingError) {
    throw new Error(rankingError.message)
  }

  const storeIdsWithRanking = [
    ...new Set((rankingRows ?? []).map((row) => String(row.store_id))),
  ]

  if (storeIdsWithRanking.length === 0) {
    return storeId
  }

  if (storeIdsWithRanking.includes(storeId)) {
    return storeId
  }

  const { data: currentBatch, error: batchError } = await supabase.rpc(
    'get_current_import_batch',
  )

  if (!batchError && currentBatch && typeof currentBatch === 'object') {
    const currentBatchId = (currentBatch as { id?: string }).id
    const currentBatchStore = (siblings ?? []).find(
      (store) =>
        store.batch_id === currentBatchId &&
        storeIdsWithRanking.includes(store.id),
    )

    if (currentBatchStore) {
      return currentBatchStore.id
    }
  }

  return storeIdsWithRanking[0]
}

async function storeHasRankingRows(
  supabase: ReturnType<typeof getSupabaseClient>,
  storeId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from('store_ranking')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)

  if (error) {
    throw new Error(error.message)
  }

  return (count ?? 0) > 0
}
