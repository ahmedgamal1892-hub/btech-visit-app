import { Loader2 } from 'lucide-react'

type LoadingScreenProps = {
  message?: string
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-4">
      <Loader2 className="size-8 animate-spin text-accent" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
