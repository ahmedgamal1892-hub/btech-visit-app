import { useQuery } from '@tanstack/react-query'

import { fetchBranchLastVisitDate } from '@/services/visits/visit-draft.service'

export const BRANCH_LAST_VISIT_QUERY_KEY = 'branch-last-visit'

export function useBranchLastVisit(storeId: string | null) {
  return useQuery({
    queryKey: [BRANCH_LAST_VISIT_QUERY_KEY, storeId],
    queryFn: () => fetchBranchLastVisitDate(storeId!),
    enabled: Boolean(storeId),
  })
}
