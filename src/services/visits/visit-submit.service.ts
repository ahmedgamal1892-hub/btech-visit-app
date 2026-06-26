import { getSupabaseClient } from '@/services/supabase/client'
import type {
  SubmitVisitInput,
  SubmitVisitResult,
  VisitPhotoDraft,
  VisitProductDraft,
  VisitStatusOption,
} from '@/types/visit'
import { isVisitProductStatus } from '@/types/visit'
import { validateNewVisit } from '@/lib/validations/new-visit'

import {
  deleteVisitPhotoStorage,
  sanitizePhotoFileName,
  uploadVisitPhotosForSubmission,
} from './visit-photo.service'

type ObservationPayload = Record<string, unknown>

type PhotoMetadataPayload = {
  id: string
  storage_path: string
  file_name: string
  photo_type: string
  mime_type: string | null
  file_size_bytes: number | null
  sort_order: number
}

type SubmitVisitCompleteRpcResponse = {
  visit_id: string
  visit_number: string
  status?: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function normalizeSubmitVisitCompletePayload(
  data: unknown,
): SubmitVisitCompleteRpcResponse | null {
  if (data == null) {
    return null
  }

  if (typeof data === 'string') {
    if (isUuid(data)) {
      return {
        visit_id: data,
        visit_number: '',
        status: 'Submitted',
      }
    }

    try {
      return normalizeSubmitVisitCompletePayload(JSON.parse(data))
    } catch {
      return null
    }
  }

  if (typeof data !== 'object') {
    return null
  }

  const payload = data as Record<string, unknown>
  const visitId =
    typeof payload.visit_id === 'string'
      ? payload.visit_id
      : typeof payload.visitId === 'string'
        ? payload.visitId
        : null
  const visitNumber =
    typeof payload.visit_number === 'string'
      ? payload.visit_number
      : typeof payload.visitNumber === 'string'
        ? payload.visitNumber
        : null

  if (!visitId) {
    return null
  }

  return {
    visit_id: visitId,
    visit_number: visitNumber ?? '',
    status: typeof payload.status === 'string' ? payload.status : 'Submitted',
  }
}

async function resolveVisitNumberFallback(
  visitId: string,
): Promise<string | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('visits')
    .select('visit_number')
    .eq('id', visitId)
    .maybeSingle()

  if (error || !data?.visit_number) {
    return null
  }

  return data.visit_number
}

function resolveStatusId(
  product: VisitProductDraft,
  statusOptions: VisitStatusOption[],
): string {
  if (!isVisitProductStatus(product.status)) {
    throw new Error(
      'Every inspection item must have a status before submitting.',
    )
  }

  const statusOption = statusOptions.find(
    (option) => option.label === product.status,
  )

  if (!statusOption) {
    throw new Error(`Status "${product.status}" is not available.`)
  }

  return statusOption.id
}

function buildObservationPayload(
  input: SubmitVisitInput,
): ObservationPayload[] {
  return input.products.map((product, index) => {
    const branchProduct = input.branchProducts.find(
      (item) => item.id === product.productId,
    )

    if (!branchProduct) {
      throw new Error('One or more selected products are no longer available.')
    }

    if (branchProduct.brand !== product.brand) {
      throw new Error('Product brand mismatch detected. Refresh and try again.')
    }

    return {
      visit_status_id: resolveStatusId(product, input.statusOptions),
      store_name: input.storeName,
      brand: branchProduct.brand,
      sub_category: branchProduct.sub_category,
      item_code: branchProduct.item_code,
      product_name: branchProduct.product_name,
      display_qty: branchProduct.display_qty,
      notes: product.notes.trim() || null,
      display_order: index,
    }
  })
}

function buildPhotoMetadataFromUploads(
  photos: VisitPhotoDraft[],
  visitId: string,
): PhotoMetadataPayload[] {
  return photos
    .filter((photo) => photo.file)
    .map((photo, index) => ({
      id: photo.id,
      storage_path: `${visitId}/${photo.id}-${sanitizePhotoFileName(photo.file!.name)}`,
      file_name: photo.file!.name,
      photo_type: 'General',
      mime_type: photo.file!.type || null,
      file_size_bytes: photo.file!.size,
      sort_order: index,
    }))
}

async function registerDraftVisit(input: {
  visitId: string
  storeId: string
  storeName: string
  startedAt: string
  importBatchId: string | null
}): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.rpc('register_draft_visit', {
    p_visit_id: input.visitId,
    p_store_id: input.storeId,
    p_store_name: input.storeName,
    p_started_at: input.startedAt,
    p_import_batch_id: input.importBatchId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function abortDraftVisit(visitId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.rpc('abort_draft_visit', {
    p_visit_id: visitId,
  })

  if (error) {
    console.error('Failed to abort draft visit:', error.message)
  }
}

async function submitVisitComplete(input: {
  visitId: string | null
  storeId: string
  storeName: string
  generalNotes: string
  startedAt: string
  importBatchId: string | null
  observations: ObservationPayload[]
  photos: PhotoMetadataPayload[]
}): Promise<{ visitId: string; visitNumber: string }> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('submit_visit_complete', {
    p_visit_id: input.visitId,
    p_store_id: input.storeId,
    p_store_name: input.storeName,
    p_general_notes: input.generalNotes,
    p_started_at: input.startedAt,
    p_import_batch_id: input.importBatchId,
    p_observations: input.observations,
    p_photos: input.photos,
  })

  // Temporary logging: inspect raw RPC payload during submit debugging.
  console.log('[submit_visit_complete] raw RPC response:', data)

  if (error) {
    throw new Error(error.message)
  }

  const payload = normalizeSubmitVisitCompletePayload(data)

  console.log('[submit_visit_complete] normalized response:', payload)

  if (!payload) {
    throw new Error('Visit submission did not return a visit reference.')
  }

  let visitNumber = payload.visit_number

  if (!visitNumber) {
    const fallbackVisitNumber = await resolveVisitNumberFallback(
      payload.visit_id,
    )

    if (!fallbackVisitNumber) {
      throw new Error('Visit submission did not return a visit reference.')
    }

    visitNumber = fallbackVisitNumber
  }

  return {
    visitId: payload.visit_id,
    visitNumber,
  }
}

function resolveImportBatchId(currentBatch: unknown): string | null {
  if (
    currentBatch &&
    typeof currentBatch === 'object' &&
    'id' in currentBatch &&
    typeof currentBatch.id === 'string'
  ) {
    return currentBatch.id
  }

  return null
}

export async function submitVisit(
  input: SubmitVisitInput,
): Promise<SubmitVisitResult> {
  const supabase = getSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: 'You must be signed in to submit a visit.',
    }
  }

  const validation = validateNewVisit({
    branchId: input.storeId,
    products: input.products,
  })

  if (!validation.isValid) {
    return {
      success: false,
      message: validation.messages[0] ?? 'Please complete all required fields.',
    }
  }

  const photosToUpload = input.photos.filter((photo) => photo.file)
  const startedAt = new Date().toISOString()
  let visitId: string | null = input.draftVisitId ?? null
  let uploadedStoragePaths: string[] = []

  try {
    const observations = buildObservationPayload(input)

    const { data: currentBatch } = await supabase.rpc(
      'get_current_import_batch',
    )

    const importBatchId = resolveImportBatchId(currentBatch)

    if (photosToUpload.length > 0) {
      if (!visitId) {
        visitId = crypto.randomUUID()

        await registerDraftVisit({
          visitId,
          storeId: input.storeId,
          storeName: input.storeName,
          startedAt,
          importBatchId,
        })
      }

      uploadedStoragePaths = await uploadVisitPhotosForSubmission({
        visitId,
        photos: photosToUpload,
      })

      const photoMetadata = buildPhotoMetadataFromUploads(
        photosToUpload,
        visitId,
      )

      const submittedVisit = await submitVisitComplete({
        visitId,
        storeId: input.storeId,
        storeName: input.storeName,
        generalNotes: input.generalNotes,
        startedAt,
        importBatchId,
        observations,
        photos: photoMetadata,
      })

      return {
        success: true,
        visitId: submittedVisit.visitId,
        visitNumber: submittedVisit.visitNumber,
      }
    }

    const submittedVisit = await submitVisitComplete({
      visitId,
      storeId: input.storeId,
      storeName: input.storeName,
      generalNotes: input.generalNotes,
      startedAt,
      importBatchId,
      observations,
      photos: [],
    })

    return {
      success: true,
      visitId: submittedVisit.visitId,
      visitNumber: submittedVisit.visitNumber,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Visit submission failed.'

    if (visitId) {
      await deleteVisitPhotoStorage(uploadedStoragePaths)
      await abortDraftVisit(visitId)
    }

    return {
      success: false,
      message,
    }
  }
}
