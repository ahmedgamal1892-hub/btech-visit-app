import { Loader2 } from 'lucide-react'

import { AppBrand } from '@/components/branding'

type LoadingScreenProps = {
  message?: string
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4">
      <AppBrand centered showTagline logoSize="lg" />
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex size-14 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
          <span className="absolute inset-1 rounded-full border-2 border-primary/20" />
          <Loader2
            className="relative size-7 animate-spin text-primary"
            aria-hidden="true"
          />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
