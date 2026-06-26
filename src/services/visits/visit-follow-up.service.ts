import { getSupabaseClient } from '@/services/supabase/client'

export type FollowUpDraftVisit = {
  visitId: string
  storeId: string
  storeName: string
  parentVisitId: string
}

export async function createFollowUpVisit(
  parentVisitId: string,
): Promise<string> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('create_follow_up_visit', {
    p_parent_visit_id: parentVisitId,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (typeof data !== 'string') {
    throw new Error('Follow-up visit was not created.')
  }

  return data
}

export async function fetchFollowUpDraftVisit(
  draftVisitId: string,
): Promise<FollowUpDraftVisit> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('visits')
    .select('id, store_id, store_name, parent_visit_id, status, user_id')
    .eq('id', draftVisitId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Follow-up draft visit was not found.')
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('You must be signed in to continue this follow-up visit.')
  }

  if (data.status !== 'Draft') {
    throw new Error('This follow-up visit is no longer editable.')
  }

  if (data.user_id !== user.id) {
    throw new Error('You are not authorized to continue this follow-up visit.')
  }

  if (!data.store_id || !data.store_name || !data.parent_visit_id) {
    throw new Error('Follow-up draft visit is missing required branch data.')
  }

  return {
    visitId: data.id,
    storeId: data.store_id,
    storeName: data.store_name,
    parentVisitId: data.parent_visit_id,
  }
}
