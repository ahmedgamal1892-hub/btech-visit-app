import { CheckCircle2, Circle } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import type { VisitProgressStep } from '@/features/visits/utils/visit-progress'
import { cn } from '@/lib/utils'

type NewVisitProgressProps = {
  steps: VisitProgressStep[]
  completionPercent: number
}

export function NewVisitProgress({
  steps,
  completionPercent,
}: NewVisitProgressProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Visit Progress
          </h3>
          <p className="text-sm text-muted-foreground">
            Complete each step to prepare your visit for submission.
          </p>
        </div>
        <p className="text-2xl font-bold tabular-nums text-primary">
          {completionPercent}%
        </p>
      </div>

      <Progress value={completionPercent} className="mt-4 h-2.5" />

      <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300',
              step.complete
                ? 'border-primary/20 bg-primary/5'
                : 'border-border/70 bg-muted/10',
            )}
          >
            {step.complete ? (
              <CheckCircle2 className="size-5 shrink-0 text-primary" />
            ) : (
              <Circle className="size-5 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Step {index + 1}</p>
              <p className="text-sm font-medium text-foreground">
                {step.label}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
