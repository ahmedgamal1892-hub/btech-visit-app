import { memo, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

type ResizeObserverLike = new (
  callback: ResizeObserverCallback,
) => ResizeObserver

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    const ResizeObserverCtor = (
      globalThis as typeof globalThis & {
        ResizeObserver?: ResizeObserverLike
      }
    ).ResizeObserver

    if (!ResizeObserverCtor) {
      setWidth(element.getBoundingClientRect().width)
      return
    }

    const observer = new ResizeObserverCtor((entries) => {
      const entry = entries[0]
      if (entry) {
        setWidth(entry.contentRect.width)
      }
    })

    observer.observe(element)
    setWidth(element.getBoundingClientRect().width)

    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

type ChartTooltipState = {
  label: string
  value: number
  x: number
  y: number
} | null

export function ChartTooltip({ tooltip }: { tooltip: ChartTooltipState }) {
  if (!tooltip) {
    return null
  }

  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-border/80 bg-card px-3 py-2 text-xs shadow-lg"
      style={{ left: tooltip.x, top: tooltip.y }}
    >
      <p className="font-medium text-foreground">{tooltip.label}</p>
      <p className="mt-0.5 tabular-nums text-primary">{tooltip.value}</p>
    </div>
  )
}

export function ChartLegend({
  points,
  className,
}: {
  points: Array<{ label: string; value: number; color?: string }>
  className?: string
}) {
  if (points.length === 0) {
    return null
  }

  return (
    <div className={cn('flex flex-wrap gap-3 pt-2', className)}>
      {points.map((point) => (
        <div
          key={point.label}
          className="inline-flex items-center gap-2 text-xs"
        >
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: point.color ?? 'var(--primary)' }}
          />
          <span className="max-w-32 truncate text-muted-foreground">
            {point.label}
          </span>
          <span className="font-medium tabular-nums text-foreground">
            {point.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export const MemoChartLegend = memo(ChartLegend)
