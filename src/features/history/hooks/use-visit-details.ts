import { useQuery } from '@tanstack/react-query'

import { fetchVisitDetails } from '@/services/visits/visit-details.service'
import { isVisitNotFoundError } from '@/types/visit-details'

export const VISIT_DETAILS_QUERY_KEY = 'visit-details'

/** @deprecated Use VISIT_DETAILS_QUERY_KEY */
export const VISIT_SUMMARY_QUERY_KEY = VISIT_DETAILS_QUERY_KEY

export function useVisitDetails(visitId: string | undefined) {
  return useQuery({
    queryKey: [VISIT_DETAILS_QUERY_KEY, visitId],
    queryFn: () => fetchVisitDetails(visitId!),
    enabled: Boolean(visitId),
    retry: (_failureCount, error) => !isVisitNotFoundError(error),
  })
}

/** @deprecated Use useVisitDetails instead */
export function useVisitSummary(visitId: string | undefined) {
  return useVisitDetails(visitId)
}
