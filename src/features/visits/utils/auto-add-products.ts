import type { BranchProduct, VisitProductDraft } from '@/types/visit'

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
