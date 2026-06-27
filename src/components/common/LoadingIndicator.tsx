import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

type LoadingIndicatorProps = {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  centered?: boolean
}

const sizeClasses = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
} as const

export function LoadingIndicator({
  message,
  size = 'md',
  className,
  centered = false,
}: LoadingIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 text-sm text-muted-foreground',
        centered && 'justify-center',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={cn('animate-spin text-primary', sizeClasses[size])}
        aria-hidden="true"
      />
      {message ? <span>{message}</span> : null}
    </div>
  )
}
