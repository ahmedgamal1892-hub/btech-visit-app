import { getSupabaseClient } from '@/services/supabase/client'
import type { VisitReviewInput, VisitReviewResult } from '@/types/visit-status'

type ReviewVisitRpcResponse = {
  visit_id: string
  status: string
  review_decision: string
}

export async function submitVisitReview(
  input: VisitReviewInput,
): Promise<VisitReviewResult> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('review_visit', {
    p_visit_id: input.visitId,
    p_review_notes: input.reviewNotes,
    p_decision: input.decision,
  })

  if (error) {
    throw new Error(error.message)
  }

  const payload = data as ReviewVisitRpcResponse

  return {
    visitId: payload.visit_id,
    status: payload.status as VisitReviewResult['status'],
    reviewDecision:
      payload.review_decision as VisitReviewResult['reviewDecision'],
  }
}
