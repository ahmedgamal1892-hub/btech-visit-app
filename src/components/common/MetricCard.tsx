import { cn } from '@/lib/utils'

type MetricCardProps = {
  label: string
  value: string | number
  className?: string
}

export function MetricCard({ label, value, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        'surface-card p-4 transition-shadow hover:shadow-lg',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  )
}
