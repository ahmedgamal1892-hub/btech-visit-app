import { LoadingIndicator } from '@/components/common/LoadingIndicator'
import { cn } from '@/lib/utils'

type PageLoadingProps = {
  message?: string
  className?: string
}

export function PageLoading({
  message = 'Loading...',
  className,
}: PageLoadingProps) {
  return (
    <div
      className={cn(
        'flex min-h-[40vh] flex-col items-center justify-center gap-3 py-20',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <LoadingIndicator />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
