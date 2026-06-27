import { CalendarDays } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTodayDateInputValue } from '@/lib/utils/visit-date'
import { cn } from '@/lib/utils'

type VisitDateFieldProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function VisitDateField({
  value,
  onChange,
  disabled = false,
  className,
}: VisitDateFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor="visit-date">
        Visit Date <span className="text-destructive">*</span>
      </Label>
      <div className="relative max-w-xs">
        <CalendarDays
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="visit-date"
          type="date"
          value={value}
          max={getTodayDateInputValue()}
          disabled={disabled}
          aria-label="Visit date"
          onChange={(event) => onChange(event.target.value)}
          className="pl-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Select the date the visit took place. Future dates are not allowed.
      </p>
    </div>
  )
}
