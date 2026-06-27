import { isVisitProductStatus } from '@/types/visit'
import type { VisitProductDraft } from '@/types/visit'

export type VisitProgressStepId = 'store' | 'products' | 'photos' | 'ready'

export type VisitProgressStep = {
  id: VisitProgressStepId
  label: string
  complete: boolean
}

export function getVisitProgressSteps(input: {
  branchSelected: boolean
  products: VisitProductDraft[]
  photosCount: number
  isReady: boolean
}): VisitProgressStep[] {
  const productsReviewed =
    input.products.length > 0 &&
    input.products.every((product) => isVisitProductStatus(product.status))

  return [
    {
      id: 'store',
      label: 'Store Selected',
      complete: input.branchSelected,
    },
    {
      id: 'products',
      label: 'Products Reviewed',
      complete: productsReviewed,
    },
    {
      id: 'photos',
      label: 'Photos Added',
      complete: input.photosCount > 0,
    },
    {
      id: 'ready',
      label: 'Visit Ready',
      complete: input.isReady,
    },
  ]
}

export function getVisitCompletionPercent(steps: VisitProgressStep[]): number {
  if (steps.length === 0) {
    return 0
  }

  const completed = steps.filter((step) => step.complete).length
  return Math.round((completed / steps.length) * 100)
}
