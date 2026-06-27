import type {
  ReportsObservationRow,
  ReportsSource,
  ReportsVisitRow,
} from '../services/reports-source.service'
import type { ReportsFilters } from '../types/reports.types'

function parseDateBoundary(
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

function getVisitDate(visit: ReportsVisitRow): Date {
  return new Date(visit.submitted_at ?? visit.started_at)
}

export function filterReportsVisits(
  source: ReportsSource,
  filters: ReportsFilters,
): ReportsVisitRow[] {
  const from = parseDateBoundary(filters.fromDate, 'start')
  const to = parseDateBoundary(filters.toDate, 'end')

  const observationVisitIds =
    filters.brand === 'all' &&
    filters.category === 'all' &&
    filters.product === 'all'
      ? null
      : new Set(
          source.observations
            .filter((row) => {
              if (filters.brand !== 'all' && row.brand !== filters.brand) {
                return false
              }

              if (
                filters.category !== 'all' &&
                row.sub_category !== filters.category
              ) {
                return false
              }

              if (
                filters.product !== 'all' &&
                row.product_name !== filters.product
              ) {
                return false
              }

              return true
            })
            .map((row) => row.visit_id),
        )

  return source.visits.filter((visit) => {
    const visitDate = getVisitDate(visit)

    if (from && visitDate < from) {
      return false
    }

    if (to && visitDate > to) {
      return false
    }

    if (filters.visitorId !== 'all' && visit.user_id !== filters.visitorId) {
      return false
    }

    if (filters.branchId !== 'all' && visit.store_id !== filters.branchId) {
      return false
    }

    if (filters.status !== 'all' && visit.status !== filters.status) {
      return false
    }

    if (observationVisitIds && !observationVisitIds.has(visit.id)) {
      return false
    }

    return true
  })
}

export function filterReportsObservations(
  observations: ReportsObservationRow[],
  visitIds: Set<string>,
  filters: ReportsFilters,
): ReportsObservationRow[] {
  return observations.filter((row) => {
    if (!visitIds.has(row.visit_id)) {
      return false
    }

    if (filters.brand !== 'all' && row.brand !== filters.brand) {
      return false
    }

    if (filters.category !== 'all' && row.sub_category !== filters.category) {
      return false
    }

    if (filters.product !== 'all' && row.product_name !== filters.product) {
      return false
    }

    return true
  })
}

export function createDefaultReportsFilters(): ReportsFilters {
  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - 29)

  const format = (date: Date) => date.toISOString().slice(0, 10)

  return {
    fromDate: format(from),
    toDate: format(today),
    visitorId: 'all',
    branchId: 'all',
    brand: 'all',
    category: 'all',
    product: 'all',
    status: 'all',
  }
}

export { getVisitDate, parseDateBoundary }
