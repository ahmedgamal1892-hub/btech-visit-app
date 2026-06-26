import { Construction } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

type PagePlaceholderProps = {
  title: string
  description?: string
  className?: string
}

export function PagePlaceholder({
  title,
  description = 'This section will be available in a future sprint.',
  className,
}: PagePlaceholderProps) {
  return (
    <Card
      className={cn(
        'mx-auto w-full max-w-2xl rounded-2xl border-border/70 shadow-sm',
        className,
      )}
    >
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Construction className="size-7" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {title}
        </CardTitle>
        <CardDescription className="max-w-md text-base">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8 text-center">
        <p className="text-lg font-medium text-muted-foreground">Coming Soon</p>
      </CardContent>
    </Card>
  )
}
