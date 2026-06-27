import { getSupabaseClient } from '@/services/supabase/client'
import { logStoreDisplayPostgrestRequest } from '@/services/supabase/log-store-display-request'
import type {
  BranchBrandPerformanceRow,
  BranchProduct,
  StoreBranch,
  VisitStatusOption,
} from '@/types/visit'
import {
  createFallbackVisitStatusOptions,
  isVisitProductStatus,
  visitStatusLabelFromDbCode,
  VISIT_PRODUCT_STATUSES,
} from '@/types/visit'

const BRANCH_PRODUCT_BASE_SELECT =
  'id, store_id, brand, sub_category, item_code, product_name, display_qty'

export async function loadBranches(): Promise<StoreBranch[]> {
  const supabase = getSupabaseClient()

  const [storesResult, currentBatchResult] = await Promise.all([
    supabase
      .from('stores')
      .select('id, name, budget_channel, batch_id, created_at')
      .order('name', { ascending: true }),
    supabase.rpc('get_current_import_batch'),
  ])

  if (storesResult.error) {
    throw new Error(storesResult.error.message)
  }

  const stores = storesResult.data ?? []
  if (stores.length === 0) {
    return []
  }

  const currentBatchId =
    currentBatchResult.data && typeof currentBatchResult.data === 'object'
      ? (currentBatchResult.data as { id?: string }).id
      : null

  const byName = new Map<string, (typeof stores)[number]>()

  for (const store of stores) {
    const key = store.name.trim()
    const existing = byName.get(key)

    if (!existing) {
      byName.set(key, store)
      continue
    }

    if (
      branchStorePreferenceScore(store, currentBatchId) >
      branchStorePreferenceScore(existing, currentBatchId)
    ) {
      byName.set(key, store)
    }
  }

  return [...byName.values()]
    .sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    )
    .map(({ id, name, budget_channel }) => ({ id, name, budget_channel }))
}

function branchStorePreferenceScore(
  store: { batch_id?: string | null; created_at?: string },
  currentBatchId: string | null | undefined,
): number {
  let score = 0

  if (currentBatchId && store.batch_id === currentBatchId) {
    score += 100
  }

  if (store.created_at) {
    score += new Date(store.created_at).getTime() / 1_000_000_000_000
  }

  return score
}

export async function loadBranchBrandPerformance(
  branchId: string,
): Promise<BranchBrandPerformanceRow[]> {
  const supabase = getSupabaseClient()
  const resolvedStoreId = await resolveStoreIdForBranchProducts(supabase, branchId)

  const { data, error } = await supabase
    .from('sales_achievement')
    .select('brand, mtd_target, actual_sales, ach_percent')
    .eq('store_id', resolvedStoreId)
    .order('brand', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    brand: row.brand,
    mtdTarget: Number(row.mtd_target),
    actualSales: Number(row.actual_sales),
    achievementPercent: Number(row.ach_percent),
  }))
}

export async function loadBranchProducts(
  branchId: string,
  debugBranchName?: string | null,
): Promise<BranchProduct[]> {
  const supabase = getSupabaseClient()
  const resolvedStoreId = await resolveStoreIdForBranchProducts(
    supabase,
    branchId,
  )

  logStoreDisplayPostgrestRequest({
    caller: 'loadBranchProducts',
    method: 'GET',
    select: BRANCH_PRODUCT_BASE_SELECT,
    filters: {
      store_id: `eq.${resolvedStoreId}`,
    },
    order: 'product_name.asc',
  })

  const { data, error } = await supabase
    .from('store_display')
    .select(BRANCH_PRODUCT_BASE_SELECT)
    .eq('store_id', resolvedStoreId)
    .order('product_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const products = mapBranchProducts(data ?? [], { includeStatus: false })

  console.log('[branch product load evidence]', {
    selectedBranchName: debugBranchName ?? null,
    selectedStoreId: branchId,
    resolvedStoreId,
    rowCount: (data ?? []).length,
    firstProductName: data?.[0]?.product_name ?? null,
  })

  if (products.length === 0) {
    return products
  }

  return mergeDisplayStatusWhenColumnExists(supabase, resolvedStoreId, products)
}

/**
 * Snapshot imports can leave multiple store rows with the same name.
 * Display products always belong to the current-batch store id.
 * If the selected branch id has no display rows, resolve a sibling by name.
 */
async function resolveStoreIdForBranchProducts(
  supabase: ReturnType<typeof getSupabaseClient>,
  branchId: string,
): Promise<string> {
  const hasDirectProducts = await storeHasDisplayProducts(supabase, branchId)
  if (hasDirectProducts) {
    return branchId
  }

  const { data: branch, error: branchError } = await supabase
    .from('stores')
    .select('id, name, batch_id')
    .eq('id', branchId)
    .maybeSingle()

  if (branchError) {
    throw new Error(branchError.message)
  }

  if (!branch?.name) {
    return branchId
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
    return branchId
  }

  logStoreDisplayPostgrestRequest({
    caller: 'resolveStoreIdForBranchProducts',
    method: 'GET',
    select: 'store_id',
    filters: {
      store_id: `in.(${siblingIds.join(',')})`,
    },
  })

  const { data: displayRows, error: displayError } = await supabase
    .from('store_display')
    .select('store_id')
    .in('store_id', siblingIds)

  if (displayError) {
    throw new Error(displayError.message)
  }

  const storeIdsWithProducts = [
    ...new Set((displayRows ?? []).map((row) => String(row.store_id))),
  ]

  if (storeIdsWithProducts.length === 0) {
    return branchId
  }

  if (storeIdsWithProducts.includes(branchId)) {
    return branchId
  }

  const { data: currentBatch, error: batchError } = await supabase.rpc(
    'get_current_import_batch',
  )

  if (!batchError && currentBatch && typeof currentBatch === 'object') {
    const currentBatchId = (currentBatch as { id?: string }).id
    const currentBatchStore = (siblings ?? []).find(
      (store) =>
        store.batch_id === currentBatchId &&
        storeIdsWithProducts.includes(store.id),
    )

    if (currentBatchStore) {
      return currentBatchStore.id
    }
  }

  return storeIdsWithProducts[0]
}

async function storeHasDisplayProducts(
  supabase: ReturnType<typeof getSupabaseClient>,
  storeId: string,
): Promise<boolean> {
  logStoreDisplayPostgrestRequest({
    caller: 'storeHasDisplayProducts',
    method: 'HEAD',
    select: 'id',
    filters: {
      store_id: `eq.${storeId}`,
    },
    prefer: 'count=exact',
  })

  const { count, error } = await supabase
    .from('store_display')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)

  if (error) {
    throw new Error(error.message)
  }

  return (count ?? 0) > 0
}

async function mergeDisplayStatusWhenColumnExists(
  supabase: ReturnType<typeof getSupabaseClient>,
  storeId: string,
  products: BranchProduct[],
): Promise<BranchProduct[]> {
  logStoreDisplayPostgrestRequest({
    caller: 'mergeDisplayStatusWhenColumnExists',
    method: 'GET',
    select: '*',
    filters: {
      store_id: `eq.${storeId}`,
    },
  })

  const { data: fullRows, error } = await supabase
    .from('store_display')
    .select('*')
    .eq('store_id', storeId)

  if (error || !fullRows?.length) {
    return products
  }

  const firstRow = fullRows[0] as Record<string, unknown>
  if (!Object.prototype.hasOwnProperty.call(firstRow, 'display_status')) {
    return products
  }

  const statusById = new Map(
    fullRows.map((row) => [
      String(row.id),
      normalizeDisplayStatus(
        (row as Record<string, unknown>).display_status,
      ),
    ]),
  )

  return products.map((product) => ({
    ...product,
    display_status: statusById.get(product.id) ?? null,
  }))
}

function normalizeDisplayStatus(
  value: unknown,
): BranchProduct['display_status'] {
  if (value === 'Display' || value === 'Delisted' || value === 'Dead') {
    return value
  }

  return null
}

function mapBranchProducts(
  rows: Array<Record<string, unknown>>,
  options: { includeStatus?: boolean } = { includeStatus: true },
): BranchProduct[] {
  return rows.map((row) => ({
    id: String(row.id),
    store_id: String(row.store_id),
    brand: String(row.brand),
    sub_category: String(row.sub_category),
    item_code: String(row.item_code),
    product_name: String(row.product_name),
    display_qty: Number(row.display_qty),
    display_status:
      options.includeStatus === false
        ? null
        : normalizeDisplayStatus(row.display_status),
  }))
}

export function getDistinctBrands(products: BranchProduct[]): string[] {
  return [...new Set(products.map((product) => product.brand))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  )
}

export function getProductsForBrand(
  products: BranchProduct[],
  brand: string,
): BranchProduct[] {
  return products
    .filter((product) => product.brand === brand)
    .sort((a, b) =>
      a.product_name.localeCompare(b.product_name, undefined, {
        sensitivity: 'base',
      }),
    )
}

export async function loadBranchBrands(branchId: string): Promise<string[]> {
  const products = await loadBranchProducts(branchId)
  return getDistinctBrands(products)
}

export async function loadVisitStatuses(): Promise<VisitStatusOption[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('visit_statuses')
    .select('id, code, label, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const mapped = (data ?? [])
    .map((row) => {
      const label =
        visitStatusLabelFromDbCode(row.code) ??
        (isVisitProductStatus(row.label) ? row.label : null)

      if (!label) {
        return null
      }

      return {
        id: row.id,
        code: row.code,
        label,
        sortOrder: row.sort_order,
      }
    })
    .filter((row): row is VisitStatusOption => row !== null)

  if (mapped.length === 0) {
    return createFallbackVisitStatusOptions()
  }

  return VISIT_PRODUCT_STATUSES.flatMap((label) => {
    const option = mapped.find((row) => row.label === label)
    return option ? [option] : []
  })
}
