import { useMutation } from '@tanstack/react-query'

import { submitVisit } from '@/services/visits'
import type { SubmitVisitInput } from '@/types/visit'

export function useSubmitVisit() {
  return useMutation({
    mutationFn: (input: SubmitVisitInput) => submitVisit(input),
  })
}
