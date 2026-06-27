import { shouldAutoAddDisplayStatus } from '@/lib/import/display-status'
import type {
  BranchProduct,
  VisitProductDraft,
  VisitProductStatus,
} from '@/types/visit'
import { isVisitProductStatus } from '@/types/visit'

export function branchHasImportedDisplayStatus(
  branchProducts: BranchProduct[],
): boolean {
  return branchProducts.some((product) => product.display_status !== null)
}

export function getImportedProductStatus(
  product: BranchProduct,
): VisitProductStatus | '' {
  if (
    !product.display_status ||
    !isVisitProductStatus(product.display_status)
  ) {
    return ''
  }

  return product.display_status
}

export function buildAutoAddedProductDrafts(
  branchProducts: BranchProduct[],
  existingProductIds: Set<string> = new Set(),
): VisitProductDraft[] {
  if (!branchHasImportedDisplayStatus(branchProducts)) {
    return []
  }

  return branchProducts
    .filter(
      (product) =>
        shouldAutoAddDisplayStatus(product.display_status) &&
        !existingProductIds.has(product.id),
    )
    .map((product) => ({
      clientId: crypto.randomUUID(),
      brand: product.brand,
      productId: product.id,
      status: getImportedProductStatus(product) as VisitProductStatus,
      notes: '',
      isAutoAdded: true,
    }))
}

export function countAvailableBranchProducts(
  branchProducts: BranchProduct[],
  addedProductIds: Set<string>,
): number {
  return branchProducts.filter((product) => !addedProductIds.has(product.id))
    .length
}

export function sortVisitProducts(
  products: VisitProductDraft[],
): VisitProductDraft[] {
  const autoAdded = products.filter((product) => product.isAutoAdded)
  const manual = products.filter((product) => !product.isAutoAdded)

  return [...autoAdded, ...manual]
}

export function partitionVisitProducts(products: VisitProductDraft[]): {
  autoAdded: VisitProductDraft[]
  manual: VisitProductDraft[]
} {
  const sorted = sortVisitProducts(products)

  return {
    autoAdded: sorted.filter((product) => product.isAutoAdded),
    manual: sorted.filter((product) => !product.isAutoAdded),
  }
}
