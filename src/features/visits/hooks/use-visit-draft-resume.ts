import { useQuery } from '@tanstack/react-query'

import { fetchVisitDraftForResume } from '@/services/visits/visit-draft.service'

export const VISIT_DRAFT_RESUME_QUERY_KEY = 'visit-draft-resume'

export function useVisitDraftResume(draftId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [VISIT_DRAFT_RESUME_QUERY_KEY, draftId],
    queryFn: () => fetchVisitDraftForResume(draftId!),
    enabled: Boolean(draftId) && enabled,
    retry: false,
  })
}
