import { useMutation, useQueryClient } from '@tanstack/react-query'

import { VISIT_DETAILS_QUERY_KEY } from '@/features/history/hooks/use-visit-details'
import { VISITS_HISTORY_QUERY_KEY } from '@/features/history/constants'
import { submitVisitReview } from '@/services/visits/visit-review.service'
import type { VisitReviewInput } from '@/types/visit-status'

export function useReviewVisit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: VisitReviewInput) => submitVisitReview(input),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [VISIT_DETAILS_QUERY_KEY, variables.visitId],
      })
      void queryClient.invalidateQueries({
        queryKey: [VISITS_HISTORY_QUERY_KEY],
      })
    },
  })
}
