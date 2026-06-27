import { GripVertical, ImagePlus, ZoomIn, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { compressImageFiles } from '@/features/visits/utils/image-compress'
import { cn } from '@/lib/utils'
import type { VisitPhotoDraft } from '@/types/visit'

type VisitPhotosUploaderProps = {
  photos: VisitPhotoDraft[]
  onChange: (photos: VisitPhotoDraft[]) => void
}

type PhotoLightboxProps = {
  photo: VisitPhotoDraft | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function PhotoLightbox({ photo, open, onOpenChange }: PhotoLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="truncate text-base">
            {photo?.file?.name ?? photo?.fileName ?? 'Visit photo'}
          </DialogTitle>
        </DialogHeader>
        {photo ? (
          <div className="max-h-[75vh] overflow-auto bg-muted/20 p-4">
            <img
              src={photo.previewUrl}
              alt={photo.file?.name ?? photo.fileName ?? 'Visit photo preview'}
              className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function VisitPhotosUploader({
  photos,
  onChange,
}: VisitPhotosUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<VisitPhotoDraft | null>(null)

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) {
        return
      }

      setIsProcessing(true)

      try {
        const compressedFiles = await compressImageFiles(Array.from(fileList))
        const nextPhotos = compressedFiles.map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        }))

        onChange([...photos, ...nextPhotos])
      } finally {
        setIsProcessing(false)

        if (inputRef.current) {
          inputRef.current.value = ''
        }
      }
    },
    [onChange, photos],
  )

  function removePhoto(photoId: string) {
    const photo = photos.find((item) => item.id === photoId)

    if (photo && !photo.persisted && photo.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photo.previewUrl)
    }

    onChange(photos.filter((item) => item.id !== photoId))
  }

  function reorderPhotos(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return
    }

    const sourceIndex = photos.findIndex((photo) => photo.id === sourceId)
    const targetIndex = photos.findIndex((photo) => photo.id === targetId)

    if (sourceIndex < 0 || targetIndex < 0) {
      return
    }

    const nextPhotos = [...photos]
    const [movedPhoto] = nextPhotos.splice(sourceIndex, 1)
    nextPhotos.splice(targetIndex, 0, movedPhoto)
    onChange(nextPhotos)
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-all duration-200',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border/70 bg-muted/10 hover:border-primary/30 hover:bg-muted/20',
        )}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragActive(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragActive(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragActive(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragActive(false)
          void addFiles(event.dataTransfer.files)
        }}
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ImagePlus className="size-6" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">
          Drag and drop visit photos here
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Images are compressed before upload. PNG, JPG, and WEBP supported.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 rounded-full"
          disabled={isProcessing}
          onClick={() => inputRef.current?.click()}
        >
          {isProcessing ? 'Processing...' : 'Browse Photos'}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void addFiles(event.target.files)}
      />

      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
          No photos added yet. Drag files here or browse to attach visit
          evidence.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => (
            <li
              key={photo.id}
              draggable
              onDragStart={() => setDraggedPhotoId(photo.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedPhotoId) {
                  reorderPhotos(draggedPhotoId, photo.id)
                }
                setDraggedPhotoId(null)
              }}
              onDragEnd={() => setDraggedPhotoId(null)}
              className={cn(
                'group relative overflow-hidden rounded-xl border bg-muted/30 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                draggedPhotoId === photo.id && 'opacity-60',
              )}
            >
              <img
                src={photo.previewUrl}
                alt={photo.file?.name ?? photo.fileName ?? 'Visit photo'}
                className="aspect-square w-full object-cover"
              />

              <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <GripVertical className="size-4 text-white" aria-hidden />
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-xs"
                    className="size-7 rounded-full"
                    onClick={() => setPreviewPhoto(photo)}
                    aria-label="Zoom photo"
                  >
                    <ZoomIn className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-xs"
                    className="size-7 rounded-full"
                    onClick={() => removePhoto(photo.id)}
                    aria-label={`Remove ${photo.file?.name ?? photo.fileName ?? 'photo'}`}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PhotoLightbox
        photo={previewPhoto}
        open={Boolean(previewPhoto)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewPhoto(null)
          }
        }}
      />
    </div>
  )
}
