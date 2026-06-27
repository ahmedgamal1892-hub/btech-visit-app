import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

type SettingsSectionCardProps = {
  title: string
  description?: string
  icon?: LucideIcon
  children: ReactNode
  className?: string
  footer?: ReactNode
}

export function SettingsSectionCard({
  title,
  description,
  icon: Icon,
  children,
  className,
  footer,
}: SettingsSectionCardProps) {
  return (
    <Card
      className={cn('shadow-md transition-shadow hover:shadow-lg', className)}
    >
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </div>
          ) : null}
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? (
              <CardDescription className="mt-1">{description}</CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">{children}</CardContent>
      {footer ? (
        <div className="border-t border-border/60 px-6 py-4">{footer}</div>
      ) : null}
    </Card>
  )
}
