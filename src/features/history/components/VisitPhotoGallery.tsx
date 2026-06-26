import { useCallback, useEffect, useState, type WheelEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { VisitDetailsPhoto } from '@/types/visit-details'

type VisitPhotoGalleryProps = {
  photos: VisitDetailsPhoto[]
}

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

export function VisitPhotoGallery({ photos }: VisitPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [zoom, setZoom] = useState(MIN_ZOOM)

  const activePhoto = activeIndex === null ? null : photos[activeIndex]

  const resetLightbox = useCallback(() => {
    setActiveIndex(null)
    setZoom(MIN_ZOOM)
  }, [])

  const showPrevious = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || photos.length === 0) {
        return current
      }

      return (current - 1 + photos.length) % photos.length
    })
    setZoom(MIN_ZOOM)
  }, [photos.length])

  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || photos.length === 0) {
        return current
      }

      return (current + 1) % photos.length
    })
    setZoom(MIN_ZOOM)
  }, [photos.length])

  useEffect(() => {
    if (activeIndex === null) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        showPrevious()
      }

      if (event.key === 'ArrowRight') {
        showNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeIndex, showNext, showPrevious])

  function handleZoomIn() {
    setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP))
  }

  function handleZoomOut() {
    setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP))
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault()

    if (event.deltaY < 0) {
      handleZoomIn()
      return
    }

    handleZoomOut()
  }

  return (
    <>
      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="size-4 text-accent" />
            Visit Photos
          </CardTitle>
          <CardDescription>
            Photos captured during this visit. Tap an image to preview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground" role="status">
              No photos were uploaded for this visit.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-muted"
                  onClick={() => {
                    setActiveIndex(index)
                    setZoom(MIN_ZOOM)
                  }}
                >
                  <img
                    src={photo.previewUrl}
                    alt={photo.fileName}
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={activePhoto !== null}
        onOpenChange={(open) => {
          if (!open) {
            resetLightbox()
          }
        }}
      >
        <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
          {activePhoto && activeIndex !== null ? (
            <>
              <DialogHeader className="gap-1 border-b px-6 py-4">
                <DialogTitle>{activePhoto.fileName}</DialogTitle>
                <DialogDescription>
                  Image {activeIndex + 1} of {photos.length}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= MIN_ZOOM}
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="size-4" />
                  </Button>
                  <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= MAX_ZOOM}
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="size-4" />
                  </Button>
                </div>

                {photos.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={showPrevious}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={showNext}
                      aria-label="Next image"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>

              <div
                className="max-h-[70vh] overflow-auto bg-muted/30 px-6 py-6"
                onWheel={handleWheel}
              >
                <img
                  src={activePhoto.previewUrl}
                  alt={activePhoto.fileName}
                  className="mx-auto max-w-none origin-center rounded-xl object-contain transition-transform duration-150"
                  style={{
                    transform: `scale(${zoom})`,
                    maxHeight: zoom === MIN_ZOOM ? '70vh' : undefined,
                    width: zoom === MIN_ZOOM ? '100%' : undefined,
                  }}
                />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
