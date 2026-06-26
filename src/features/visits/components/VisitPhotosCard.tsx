import { Camera } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { VisitPhotoDraft } from '@/types/visit'

import { VisitPhotosUploader } from './VisitPhotosUploader'

type VisitPhotosCardProps = {
  photos: VisitPhotoDraft[]
  onChange: (photos: VisitPhotoDraft[]) => void
}

export function VisitPhotosCard({ photos, onChange }: VisitPhotosCardProps) {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="size-4 text-accent" />
          Visit Photos
        </CardTitle>
        <CardDescription>
          Upload photos for this visit. Images are attached to the visit, not
          individual products.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VisitPhotosUploader photos={photos} onChange={onChange} />
      </CardContent>
    </Card>
  )
}
