import { ImagePlus, X } from 'lucide-react'
import { useRef } from 'react'

import { Button } from '@/components/ui/button'
import type { VisitPhotoDraft } from '@/types/visit'

type VisitPhotosUploaderProps = {
  photos: VisitPhotoDraft[]
  onChange: (photos: VisitPhotoDraft[]) => void
}

export function VisitPhotosUploader({
  photos,
  onChange,
}: VisitPhotosUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return
    }

    const nextPhotos = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    onChange([...photos, ...nextPhotos])

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  function removePhoto(photoId: string) {
    const photo = photos.find((item) => item.id === photoId)

    if (photo && !photo.persisted && photo.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photo.previewUrl)
    }

    onChange(photos.filter((item) => item.id !== photoId))
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          Add Photos
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => handleFilesSelected(event.target.files)}
      />

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos selected yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="group relative overflow-hidden rounded-lg border bg-muted/30"
            >
              <img
                src={photo.previewUrl}
                alt={photo.file?.name ?? photo.fileName ?? 'Visit photo'}
                className="aspect-square w-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                className="absolute top-2 right-2 opacity-90"
                onClick={() => removePhoto(photo.id)}
                aria-label={`Remove ${photo.file?.name ?? photo.fileName ?? 'photo'}`}
              >
                <X className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
