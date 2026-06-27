import type { ReactNode } from 'react'

import { EmptyState } from '@/components/common'
import { cn } from '@/lib/utils'

type PagePlaceholderProps = {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function PagePlaceholder({
  title,
  description = 'This section will be available in a future sprint.',
  action,
  className,
}: PagePlaceholderProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={action}
      useBrandLogo
      className={cn('mx-auto w-full max-w-2xl', className)}
    />
  )
}
