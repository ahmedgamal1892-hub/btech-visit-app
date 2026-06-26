import { useMutation } from '@tanstack/react-query'

import { createFollowUpVisit } from '@/services/visits/visit-follow-up.service'

export function useCreateFollowUpVisit() {
  return useMutation({
    mutationFn: (parentVisitId: string) => createFollowUpVisit(parentVisitId),
  })
}
