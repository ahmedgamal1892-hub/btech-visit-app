import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SettingsInfoRowProps = {
  label: string
  value: ReactNode
  hint?: string
  className?: string
}

export function SettingsInfoRow({
  label,
  value,
  hint,
  className,
}: SettingsInfoRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0 sm:max-w-xs">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div className="text-sm text-foreground sm:text-right">{value}</div>
    </div>
  )
}
