import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function PrimaryButton(props: ComponentProps<typeof Button>) {
  return <Button variant="default" {...props} />
}

export function SecondaryButton(props: ComponentProps<typeof Button>) {
  return <Button variant="secondary" {...props} />
}

export function DangerButton(props: ComponentProps<typeof Button>) {
  return <Button variant="destructive" {...props} />
}

export function GhostButton(props: ComponentProps<typeof Button>) {
  return <Button variant="ghost" {...props} />
}

type TableActionButtonProps = ComponentProps<typeof Button> & {
  icon?: LucideIcon
  label: string
  tone?: 'default' | 'danger'
}

export function TableActionButton({
  icon: Icon,
  label,
  tone = 'default',
  className,
  size = 'sm',
  variant = 'outline',
  ...props
}: TableActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        'h-8 gap-1.5 px-2.5 shadow-none transition-colors',
        tone === 'danger' &&
          'text-destructive hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive',
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      <span>{label}</span>
    </Button>
  )
}
