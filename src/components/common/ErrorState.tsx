import { AlertCircle, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ErrorStateProps = {
  title?: string
  message: string
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertCircle className="size-7" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-6"
          onClick={onRetry}
          disabled={isRetrying}
        >
          <RefreshCw
            className={cn('size-4', isRetrying && 'animate-spin')}
            aria-hidden="true"
          />
          {isRetrying ? 'Retrying...' : 'Try again'}
        </Button>
      ) : null}
    </div>
  )
}
