import { getSupabaseClient } from '@/services/supabase/client'
import type { VisitProductDraft } from '@/types/visit'
import {
  isVisitDateAllowed,
  startedAtToVisitDateInput,
} from '@/lib/utils/visit-date'

export type SaveVisitDraftInput = {
  visitId: string | null
  storeId: string
  storeName: string
  generalNotes: string
  products: VisitProductDraft[]
  startedAt: string
}

export type SaveVisitDraftResult =
  | { success: true; visitId: string }
  | { success: false; message: string }

export type VisitDraftResumeData = {
  visitId: string
  storeId: string
  storeName: string
  generalNotes: string
  products: VisitProductDraft[]
  visitNumber: string | null
  isFollowUp: boolean
  startedAt: string
}

function serializeInspectionItems(products: VisitProductDraft[]) {
  return products.map((product) => ({
    clientId: product.clientId,
    brand: product.brand,
    productId: product.productId,
    status: product.status,
    notes: product.notes,
    isAutoAdded: product.isAutoAdded ?? false,
  }))
}

function parseInspectionItems(value: unknown): VisitProductDraft[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const record = item as Record<string, unknown>

      return {
        clientId:
          typeof record.clientId === 'string'
            ? record.clientId
            : crypto.randomUUID(),
        brand: typeof record.brand === 'string' ? record.brand : '',
        productId: typeof record.productId === 'string' ? record.productId : '',
        status:
          typeof record.status === 'string'
            ? (record.status as VisitProductDraft['status'])
            : '',
        notes: typeof record.notes === 'string' ? record.notes : '',
        ...(record.isAutoAdded === true ? { isAutoAdded: true } : {}),
      }
    })
    .filter((item): item is VisitProductDraft => item !== null)
}

export async function saveVisitDraft(
  input: SaveVisitDraftInput,
): Promise<SaveVisitDraftResult> {
  if (!isVisitDateAllowed(startedAtToVisitDateInput(input.startedAt))) {
    return {
      success: false,
      message: 'Visit date cannot be in the future.',
    }
  }

  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('save_visit_draft', {
    p_visit_id: input.visitId,
    p_store_id: input.storeId,
    p_store_name: input.storeName,
    p_general_notes: input.generalNotes,
    p_inspection_items: serializeInspectionItems(input.products),
    p_started_at: input.startedAt,
  })

  if (error) {
    return {
      success: false,
      message: error.message,
    }
  }

  if (typeof data !== 'string') {
    return {
      success: false,
      message: 'Draft visit could not be saved.',
    }
  }

  return {
    success: true,
    visitId: data,
  }
}

export async function fetchVisitDraftForResume(
  draftVisitId: string,
): Promise<VisitDraftResumeData> {
  const supabase = getSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('You must be signed in to continue this draft visit.')
  }

  const { data, error } = await supabase
    .from('visits')
    .select(
      'id, store_id, store_name, general_notes, draft_inspection_items, visit_number, status, user_id, parent_visit_id, started_at',
    )
    .eq('id', draftVisitId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Draft visit was not found.')
  }

  if (data.status !== 'Draft') {
    throw new Error('This visit is no longer editable.')
  }

  if (data.user_id !== user.id) {
    throw new Error('You are not authorized to continue this draft visit.')
  }

  if (!data.store_id || !data.store_name) {
    throw new Error('Draft visit is missing required branch data.')
  }

  return {
    visitId: data.id,
    storeId: data.store_id,
    storeName: data.store_name,
    generalNotes: data.general_notes ?? '',
    products: parseInspectionItems(data.draft_inspection_items),
    visitNumber: data.visit_number,
    isFollowUp: Boolean(data.parent_visit_id),
    startedAt: data.started_at,
  }
}

export async function fetchBranchLastVisitDate(
  storeId: string,
): Promise<string | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('visits')
    .select('submitted_at, started_at')
    .eq('store_id', storeId)
    .eq('status', 'Submitted')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data.submitted_at ?? data.started_at ?? null
}
