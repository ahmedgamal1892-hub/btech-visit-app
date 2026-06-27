import { useMutation, useQueryClient } from '@tanstack/react-query'

import { VISITS_HISTORY_QUERY_KEY } from '@/features/history/constants'
import { VISIT_DETAILS_QUERY_KEY } from '@/features/history/hooks/use-visit-details'
import { deleteVisit } from '@/services/visits/visit-delete.service'

export function useDeleteVisit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (visitId: string) => deleteVisit(visitId),
    onSuccess: (_result, visitId) => {
      void queryClient.invalidateQueries({
        queryKey: [VISITS_HISTORY_QUERY_KEY],
      })
      void queryClient.removeQueries({
        queryKey: [VISIT_DETAILS_QUERY_KEY, visitId],
      })
    },
  })
}
