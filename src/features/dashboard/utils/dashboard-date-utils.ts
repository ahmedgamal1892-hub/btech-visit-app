import type { DashboardVisitRow } from '../services/executive-dashboard.service'

export function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function endOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

export function startOfWeek(date: Date): Date {
  const next = startOfDay(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  return next
}

export function parseDateBoundary(
  value: string,
  boundary: 'start' | 'end',
): Date | null {
  if (!value.trim()) {
    return null
  }

  const date = new Date(
    `${value}T${boundary === 'start' ? '00:00:00' : '23:59:59.999'}`,
  )

  return Number.isNaN(date.getTime()) ? null : date
}

export function getVisitDate(visit: DashboardVisitRow): Date {
  return new Date(visit.started_at)
}

export function formatDurationLabel(totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return '—'
  }

  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)} min`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

export function getVisitDurationMinutes(
  visit: DashboardVisitRow,
): number | null {
  if (!visit.submitted_at) {
    return null
  }

  const started = new Date(visit.started_at).getTime()
  const submitted = new Date(visit.submitted_at).getTime()
  if (
    Number.isNaN(started) ||
    Number.isNaN(submitted) ||
    submitted <= started
  ) {
    return null
  }

  return Math.round((submitted - started) / 60_000)
}
