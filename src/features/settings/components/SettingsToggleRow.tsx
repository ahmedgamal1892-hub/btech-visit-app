import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

type SettingsToggleRowProps = {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  trailing?: ReactNode
  className?: string
}

export function SettingsToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  trailing,
  className,
}: SettingsToggleRowProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/35',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
        {trailing ? <div className="mt-2">{trailing}</div> : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  )
}
