export type StoreBranch = {
  id: string
  name: string
  budget_channel: string | null
}

export type BranchProduct = {
  id: string
  store_id: string
  brand: string
  sub_category: string
  item_code: string
  product_name: string
  display_qty: number
}

export type BranchBrandPerformanceRow = {
  brand: string
  mtdTarget: number
  actualSales: number
  achievementPercent: number
}

export type VisitProductStatus =
  | 'Sellable'
  | 'Display'
  | 'Delisted'
  | 'Dead'
  | 'Damaged'

export const VISIT_PRODUCT_STATUSES = [
  'Sellable',
  'Display',
  'Delisted',
  'Dead',
  'Damaged',
] as const satisfies readonly VisitProductStatus[]

export type VisitStatusOption = {
  id: string
  code: string
  label: VisitProductStatus
  sortOrder: number
}

/** Maps UI labels to `visit_statuses.code` values in Supabase. */
export const VISIT_STATUS_DB_CODE_BY_LABEL: Record<VisitProductStatus, string> =
  {
    Sellable: 'saleable',
    Display: 'display',
    Delisted: 'delisted',
    Dead: 'dead',
    Damaged: 'damaged',
  }

export function isVisitProductStatus(
  value: string,
): value is VisitProductStatus {
  return (VISIT_PRODUCT_STATUSES as readonly string[]).includes(value)
}

export function visitStatusLabelFromDbCode(
  code: string,
): VisitProductStatus | null {
  const match = Object.entries(VISIT_STATUS_DB_CODE_BY_LABEL).find(
    ([, dbCode]) => dbCode === code,
  )

  return match ? (match[0] as VisitProductStatus) : null
}

export function visitStatusDbCodeFromLabel(label: VisitProductStatus): string {
  return VISIT_STATUS_DB_CODE_BY_LABEL[label]
}

export const VISIT_STATUS_ICON_BY_LABEL: Record<VisitProductStatus, string> = {
  Sellable: '🟢',
  Display: '🔵',
  Delisted: '⚫',
  Dead: '🔴',
  Damaged: '🟠',
}

export function visitStatusIcon(status: VisitProductStatus): string {
  return VISIT_STATUS_ICON_BY_LABEL[status]
}

export function createFallbackVisitStatusOptions(): VisitStatusOption[] {
  return VISIT_PRODUCT_STATUSES.map((label, index) => ({
    id: visitStatusDbCodeFromLabel(label),
    code: visitStatusDbCodeFromLabel(label),
    label,
    sortOrder: index + 1,
  }))
}

export type VisitPhotoDraft = {
  id: string
  previewUrl: string
  file?: File
  storagePath?: string
  fileName?: string
  persisted?: boolean
}

export type VisitProductDraft = {
  clientId: string
  brand: string
  productId: string
  status: VisitProductStatus | ''
  notes: string
  isAutoAdded?: boolean
}

export function isVisitProductIncomplete(product: VisitProductDraft): boolean {
  if (!product.productId) {
    return true
  }

  return !isVisitProductStatus(product.status)
}

export type SubmitVisitInput = {
  storeId: string
  storeName: string
  generalNotes: string
  startedAt: string
  branchProducts: BranchProduct[]
  products: VisitProductDraft[]
  photos: VisitPhotoDraft[]
  statusOptions: VisitStatusOption[]
  draftVisitId?: string
}

export type SubmitVisitResult =
  | { success: true; visitId: string; visitNumber: string }
  | { success: false; message: string }

export type VisitSubmitSuccessState = {
  visitId: string
  visitNumber: string
  visitDate: string
  submittedAt: string
  branchName: string
  visitorName: string
}
