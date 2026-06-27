import { Search } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type SearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className'
> & {
  className?: string
  inputClassName?: string
}

export function SearchInput({
  className,
  inputClassName,
  id,
  placeholder = 'Search...',
  ...props
}: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        placeholder={placeholder}
        className={cn('pl-9', inputClassName)}
        aria-label={props['aria-label'] ?? placeholder}
        {...props}
      />
    </div>
  )
}
