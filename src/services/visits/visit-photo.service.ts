import { getSupabaseClient } from '@/services/supabase/client'
import type { VisitPhotoDraft } from '@/types/visit'

export const VISIT_PHOTOS_BUCKET = 'visit-photos'
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024
const SIGNED_URL_TTL_SECONDS = 60 * 60

export function sanitizePhotoFileName(fileName: string): string {
  const baseName = fileName.split(/[/\\]/).pop() ?? 'photo'
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')

  return sanitized.length > 0 ? sanitized : 'photo'
}

export async function createPersistedPhotoPreviewUrl(
  storagePath: string,
): Promise<string> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.storage
    .from(VISIT_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

  if (error) {
    throw error
  }

  if (!data?.signedUrl) {
    throw new Error('Could not load a saved visit photo.')
  }

  return data.signedUrl
}

export async function uploadVisitPhotosForSubmission(input: {
  visitId: string
  photos: VisitPhotoDraft[]
}): Promise<string[]> {
  const supabase = getSupabaseClient()
  const storagePaths: string[] = []

  try {
    for (const photo of input.photos) {
      if (!photo.file) {
        continue
      }

      if (photo.file.size > MAX_PHOTO_SIZE_BYTES) {
        throw new Error(
          `Photo "${photo.file.name}" exceeds the 5 MB upload limit.`,
        )
      }

      const storagePath = `${input.visitId}/${photo.id}-${sanitizePhotoFileName(photo.file.name)}`

      const { error: uploadError } = await supabase.storage
        .from(VISIT_PHOTOS_BUCKET)
        .upload(storagePath, photo.file, {
          contentType: photo.file.type || 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Photo upload failed: ${uploadError.message}`)
      }

      storagePaths.push(storagePath)
    }

    return storagePaths
  } catch (error) {
    await deleteVisitPhotoStorage(storagePaths)
    throw error
  }
}

export async function deleteVisitPhotoStorage(
  storagePaths: string[],
): Promise<void> {
  if (storagePaths.length === 0) {
    return
  }

  const supabase = getSupabaseClient()

  const { error } = await supabase.storage
    .from(VISIT_PHOTOS_BUCKET)
    .remove(storagePaths)

  if (error) {
    console.error('Failed to remove uploaded visit photos:', error.message)
  }
}
