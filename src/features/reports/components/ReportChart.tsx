import { memo, useMemo, useState } from 'react'

import { EmptyState } from '@/components/common'
import { cn } from '@/lib/utils'

import type { ReportChartPoint } from '../types/reports.types'

type ReportChartProps = {
  type: 'bar' | 'pie' | 'line' | 'area' | 'heatmap'
  points: ReportChartPoint[]
  className?: string
  height?: number
}

export const ReportChart = memo(function ReportChart({
  type,
  points,
  className,
  height = 220,
}: ReportChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const maxValue = Math.max(...points.map((point) => point.value), 1)
  const total = points.reduce((sum, point) => sum + point.value, 0)

  const gradient = useMemo(() => {
    let cumulative = 0
    return points
      .map((point) => {
        const start = (cumulative / total) * 100
        cumulative += point.value
        const end = (cumulative / total) * 100
        return `${point.color ?? '#FF6A00'} ${start}% ${end}%`
      })
      .join(', ')
  }, [points, total])

  if (points.length === 0) {
    return (
      <EmptyState
        title="No chart data"
        description="Adjust filters to populate this chart."
        className="py-8"
      />
    )
  }

  if (type === 'pie') {
    return (
      <div className={cn('flex flex-col items-center gap-4', className)}>
        <div
          className="size-44 rounded-full"
          style={{
            background: total > 0 ? `conic-gradient(${gradient})` : '#E5E7EB',
          }}
        >
          <div className="flex size-full items-center justify-center p-10">
            <div className="flex size-full items-center justify-center rounded-full bg-card text-center shadow-inner">
              <div>
                <p className="text-2xl font-bold text-primary">{total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {points.map((point) => (
            <div
              key={point.label}
              className="inline-flex items-center gap-2 text-xs"
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: point.color ?? '#FF6A00' }}
              />
              <span>{point.label}</span>
              <span className="font-medium">{point.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'heatmap') {
    const gridSize = Math.ceil(Math.sqrt(points.length))
    return (
      <div
        className={cn('grid gap-1', className)}
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      >
        {points.map((point, index) => (
          <div
            key={`${point.label}-${index}`}
            className="rounded-md p-2 text-center text-[10px] text-white"
            style={{
              backgroundColor: point.color ?? '#FF6A00',
              opacity: Math.max(point.value / maxValue, 0.25),
            }}
            title={`${point.label}: ${point.value}`}
          >
            <div className="truncate">{point.label}</div>
            <div className="font-semibold">{point.value}</div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'line' || type === 'area') {
    const width = 100
    const coords = points.map((point, index) => {
      const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width
      const y = height - (point.value / maxValue) * (height - 20)
      return `${x},${y}`
    })
    const path = coords.join(' ')
    const areaPath = `0,${height} ${path} ${width},${height}`

    return (
      <div className={cn('relative', className)}>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {type === 'area' ? (
            <polygon points={areaPath} fill="rgba(255,106,0,0.18)" />
          ) : null}
          <polyline
            points={path}
            fill="none"
            stroke="#FF6A00"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)} style={{ minHeight: height }}>
      <div className="flex h-full items-end gap-2">
        {points.map((point, index) => (
          <div
            key={`${point.label}-${index}`}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div
              className="w-full max-w-10 origin-bottom rounded-t-lg transition-all duration-500"
              style={{
                height: `${Math.max((point.value / maxValue) * 100, 4)}%`,
                backgroundColor: point.color ?? '#FF6A00',
                opacity: hovered === null || hovered === index ? 1 : 0.45,
              }}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              title={`${point.label}: ${point.value}`}
            />
            <span className="truncate text-[10px] text-muted-foreground">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
