import { useMutation } from '@tanstack/react-query'

import {
  saveVisitDraft,
  type SaveVisitDraftInput,
} from '@/services/visits/visit-draft.service'

export function useSaveVisitDraft() {
  return useMutation({
    mutationFn: (input: SaveVisitDraftInput) => saveVisitDraft(input),
  })
}
