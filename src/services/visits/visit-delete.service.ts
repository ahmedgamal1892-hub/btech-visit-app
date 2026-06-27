import { getSupabaseClient } from '@/services/supabase/client'
import { deleteVisitPhotoStorage } from '@/services/visits/visit-photo.service'

type DeleteVisitRpcResponse = {
  visit_id: string
  storage_paths: string[]
}

export type DeleteVisitResult = {
  visitId: string
}

export async function deleteVisit(visitId: string): Promise<DeleteVisitResult> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('delete_visit', {
    p_visit_id: visitId,
  })

  if (error) {
    throw new Error(error.message)
  }

  const payload = data as DeleteVisitRpcResponse
  const storagePaths = payload.storage_paths ?? []

  if (storagePaths.length > 0) {
    await deleteVisitPhotoStorage(storagePaths)
  }

  return {
    visitId: payload.visit_id,
  }
}
