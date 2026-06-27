import { getSupabaseClient } from '@/services/supabase/client'
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

export async function loadBranches(): Promise<StoreBranch[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('stores')
    .select('id, name, budget_channel')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function loadBranchBrandPerformance(
  branchId: string,
): Promise<BranchBrandPerformanceRow[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('sales_achievement')
    .select('brand, mtd_target, actual_sales, ach_percent')
    .eq('store_id', branchId)
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
): Promise<BranchProduct[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('store_display')
    .select(
      'id, store_id, brand, sub_category, item_code, product_name, display_qty, display_status',
    )
    .eq('store_id', branchId)
    .order('product_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    ...row,
    display_status:
      row.display_status === 'Display' ||
      row.display_status === 'Delisted' ||
      row.display_status === 'Dead'
        ? row.display_status
        : null,
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
