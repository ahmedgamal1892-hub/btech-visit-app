import { useQuery } from '@tanstack/react-query'

import { fetchFollowUpDraftVisit } from '@/services/visits/visit-follow-up.service'

export const FOLLOW_UP_DRAFT_QUERY_KEY = 'follow-up-draft'

export function useFollowUpDraftVisit(draftId: string | null) {
  return useQuery({
    queryKey: [FOLLOW_UP_DRAFT_QUERY_KEY, draftId],
    queryFn: () => fetchFollowUpDraftVisit(draftId!),
    enabled: Boolean(draftId),
    retry: false,
  })
}
