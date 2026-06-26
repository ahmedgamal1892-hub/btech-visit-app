import type { VisitProductDraft } from '@/types/visit'
import { isVisitProductStatus } from '@/types/visit'

export type NewVisitSectionId =
  | 'info'
  | 'branch'
  | 'performance'
  | 'inspection'
  | 'photos'
  | 'notes'
  | 'submit'

export type NewVisitValidationIssue = {
  message: string
  sectionId: NewVisitSectionId
}

export type NewVisitValidation = {
  isValid: boolean
  messages: string[]
  issues: NewVisitValidationIssue[]
}

export function validateNewVisit(input: {
  branchId: string | null
  products: VisitProductDraft[]
}): NewVisitValidation {
  const issues: NewVisitValidationIssue[] = []

  if (!input.branchId) {
    issues.push({
      message: 'Select a branch.',
      sectionId: 'branch',
    })
  }

  if (input.products.length === 0) {
    issues.push({
      message: 'Add at least one inspection item.',
      sectionId: 'inspection',
    })
  } else {
    const invalidStatuses = input.products.filter(
      (product) => !isVisitProductStatus(product.status),
    )

    if (invalidStatuses.length > 0) {
      issues.push({
        message: 'Choose a status for all inspection items.',
        sectionId: 'inspection',
      })
    }
  }

  return {
    isValid: issues.length === 0,
    messages: issues.map((issue) => issue.message),
    issues,
  }
}

export function canAddProduct(branchId: string | null): boolean {
  return Boolean(branchId)
}

export function getNewVisitSectionElementId(
  sectionId: NewVisitSectionId,
): string {
  return `new-visit-section-${sectionId}`
}

export function scrollToNewVisitSection(sectionId: NewVisitSectionId): void {
  const element = document.getElementById(
    getNewVisitSectionElementId(sectionId),
  )

  element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
