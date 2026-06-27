import { canOwnVisits } from '@/lib/utils/visit-owners'
import { getChartColor } from '@/features/dashboard/constants/chart-colors'
import {
  endOfDay,
  getVisitDate,
  parseDateBoundary,
  startOfDay,
  startOfWeek,
} from '@/features/dashboard/utils/dashboard-date-utils'

import type {
  ReportsObservationRow,
  ReportsSource,
  ReportsVisitRow,
} from '../services/reports-source.service'
import { getReportsProfileName } from '../services/reports-source.service'
import type {
  BranchReportRow,
  ExecutiveReportData,
  PerformancePeriod,
  PerformanceReportData,
  PhotoReportData,
  ProductReportRow,
  ReportChartPoint,
  ReportsCenterData,
  ReportsFilterOptions,
  ReportsFilters,
  VisitorReportRow,
} from '../types/reports.types'
import {
  filterReportsObservations,
  filterReportsVisits,
} from './filter-reports'

const ISSUE_CODES = new Set(['delisted', 'dead', 'damaged'])

function withColors(points: ReportChartPoint[]): ReportChartPoint[] {
  return points.map((point, index) => ({
    ...point,
    color: point.color ?? getChartColor(index),
  }))
}

function isCompletedStatus(status: string): boolean {
  return status === 'Submitted' || status === 'Reviewed'
}

function isPendingStatus(status: string): boolean {
  return status === 'Draft'
}

function isCancelledStatus(status: string): boolean {
  return status === 'Closed'
}

function buildProfileMap(source: ReportsSource): Map<string, string> {
  return new Map(
    source.profiles.map((profile) => [
      profile.id,
      getReportsProfileName(profile),
    ]),
  )
}

function buildStatusMaps(source: ReportsSource) {
  const codeMap = new Map(
    source.statuses.map((status) => [status.id, status.code.toLowerCase()]),
  )
  const labelMap = new Map(
    source.statuses.map((status) => [status.id, status.label]),
  )

  return { codeMap, labelMap }
}

function getDayCount(filters: ReportsFilters): number {
  const from =
    parseDateBoundary(filters.fromDate, 'start') ??
    startOfDay(new Date(Date.now() - 29 * 86400000))
  const to = parseDateBoundary(filters.toDate, 'end') ?? endOfDay(new Date())

  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1)
}

function buildExecutiveReport(
  visits: ReportsVisitRow[],
  observations: ReportsObservationRow[],
  photos: ReportsSource['photos'],
  profileNames: Map<string, string>,
  filters: ReportsFilters,
): ExecutiveReportData {
  const completedVisits = visits.filter((visit) =>
    isCompletedStatus(visit.status),
  )
  const visitorCounts = new Map<string, number>()
  const branchCounts = new Map<string, number>()
  const productCounts = new Map<string, number>()

  for (const visit of completedVisits) {
    visitorCounts.set(
      visit.user_id,
      (visitorCounts.get(visit.user_id) ?? 0) + 1,
    )
    branchCounts.set(
      visit.store_name,
      (branchCounts.get(visit.store_name) ?? 0) + 1,
    )
  }

  for (const row of observations) {
    productCounts.set(
      row.product_name,
      (productCounts.get(row.product_name) ?? 0) + 1,
    )
  }

  const topVisitorEntry = [...visitorCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]
  const topBranchEntry = [...branchCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]
  const topProductEntry = [...productCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]

  const statusChart = withColors([
    {
      label: 'Completed',
      value: visits.filter((visit) => isCompletedStatus(visit.status)).length,
    },
    {
      label: 'Pending',
      value: visits.filter((visit) => isPendingStatus(visit.status)).length,
    },
    {
      label: 'Cancelled',
      value: visits.filter((visit) => isCancelledStatus(visit.status)).length,
    },
  ])

  const today = startOfDay(new Date())
  const trendChart: ReportChartPoint[] = []

  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = startOfDay(new Date(today.getTime() - offset * 86400000))
    const dayEnd = endOfDay(day)
    trendChart.push({
      label: day.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      value: completedVisits.filter((visit) => {
        const date = getVisitDate(visit)
        return date >= day && date <= dayEnd
      }).length,
    })
  }

  return {
    totalVisits: visits.length,
    completedVisits: visits.filter((visit) => isCompletedStatus(visit.status))
      .length,
    pendingVisits: visits.filter((visit) => isPendingStatus(visit.status))
      .length,
    cancelledVisits: visits.filter((visit) => isCancelledStatus(visit.status))
      .length,
    branchesCovered: new Set(
      completedVisits
        .map((visit) => visit.store_id)
        .filter((id): id is string => Boolean(id)),
    ).size,
    productsChecked: observations.length,
    photosUploaded: photos.length,
    visitorsActive: new Set(completedVisits.map((visit) => visit.user_id)).size,
    averageVisitsPerDay:
      completedVisits.length > 0
        ? Number((completedVisits.length / getDayCount(filters)).toFixed(1))
        : 0,
    topVisitor: topVisitorEntry
      ? (profileNames.get(topVisitorEntry[0]) ?? 'Unknown')
      : '—',
    topBranch: topBranchEntry?.[0] ?? '—',
    topProduct: topProductEntry?.[0] ?? '—',
    statusChart,
    trendChart: withColors(trendChart),
  }
}

function buildVisitorReports(
  visits: ReportsVisitRow[],
  observations: ReportsObservationRow[],
  photos: ReportsSource['photos'],
  profileNames: Map<string, string>,
  filters: ReportsFilters,
): VisitorReportRow[] {
  const completed = visits.filter((visit) => isCompletedStatus(visit.status))
  const dayCount = getDayCount(filters)
  const stats = new Map<
    string,
    {
      visits: number
      branches: Set<string>
      products: number
      photos: number
      lastVisit: string | null
    }
  >()

  for (const visit of completed) {
    const current = stats.get(visit.user_id) ?? {
      visits: 0,
      branches: new Set<string>(),
      products: 0,
      photos: 0,
      lastVisit: null,
    }
    current.visits += 1
    if (visit.store_id) {
      current.branches.add(visit.store_id)
    }

    const visitDate = visit.started_at
    if (
      !current.lastVisit ||
      new Date(visitDate).getTime() > new Date(current.lastVisit).getTime()
    ) {
      current.lastVisit = visitDate
    }

    stats.set(visit.user_id, current)
  }

  const visitIdsByUser = new Map<string, Set<string>>()
  for (const visit of completed) {
    const set = visitIdsByUser.get(visit.user_id) ?? new Set<string>()
    set.add(visit.id)
    visitIdsByUser.set(visit.user_id, set)
  }

  for (const [userId, userStats] of stats) {
    const visitIds = visitIdsByUser.get(userId) ?? new Set<string>()
    userStats.products = observations.filter((row) =>
      visitIds.has(row.visit_id),
    ).length
    userStats.photos = photos.filter((photo) =>
      visitIds.has(photo.visit_id),
    ).length
  }

  return [...stats.entries()]
    .map(([userId, data]) => ({
      userId,
      visitorName: profileNames.get(userId) ?? 'Unknown visitor',
      visits: data.visits,
      branches: data.branches.size,
      products: data.products,
      photos: data.photos,
      averagePerDay: Number((data.visits / dayCount).toFixed(2)),
      lastVisit: data.lastVisit,
    }))
    .sort((a, b) => b.visits - a.visits)
}

function buildBranchReports(
  source: ReportsSource,
  visits: ReportsVisitRow[],
  observations: ReportsObservationRow[],
  photos: ReportsSource['photos'],
  filters: ReportsFilters,
): BranchReportRow[] {
  const { codeMap, labelMap } = buildStatusMaps(source)
  const completed = visits.filter((visit) => isCompletedStatus(visit.status))
  const now = startOfDay(new Date())
  const rows: BranchReportRow[] = []

  for (const store of source.stores) {
    const branchVisits = completed.filter(
      (visit) => visit.store_id === store.id,
    )
    const visitIds = new Set(branchVisits.map((visit) => visit.id))
    const branchObservations = observations.filter((row) =>
      visitIds.has(row.visit_id),
    )
    const branchPhotos = photos.filter((photo) => visitIds.has(photo.visit_id))

    const issueCounts = new Map<string, number>()
    let healthyCount = 0

    for (const row of branchObservations) {
      const code = codeMap.get(row.visit_status_id)
      if (code && ISSUE_CODES.has(code)) {
        const label = labelMap.get(row.visit_status_id) ?? code
        issueCounts.set(label, (issueCounts.get(label) ?? 0) + 1)
      } else {
        healthyCount += 1
      }
    }

    const topIssue = [...issueCounts.entries()].sort((a, b) => b[1] - a[1])[0]
    const lastVisit = branchVisits
      .map((visit) => visit.started_at)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]

    const lastVisitDate = lastVisit ? startOfDay(new Date(lastVisit)) : null
    const notVisitedDays = lastVisitDate
      ? Math.max(
          0,
          Math.floor((now.getTime() - lastVisitDate.getTime()) / 86400000),
        )
      : getDayCount(filters)

    const averageScore =
      branchObservations.length > 0
        ? Math.round((healthyCount / branchObservations.length) * 100)
        : 0

    rows.push({
      branchId: store.id,
      branchName: store.name,
      visitCount: branchVisits.length,
      lastVisit: lastVisit ?? null,
      productsChecked: branchObservations.length,
      photos: branchPhotos.length,
      averageScore,
      mostCommonIssue: topIssue?.[0] ?? 'None',
      notVisitedDays,
    })
  }

  return rows.sort((a, b) => b.visitCount - a.visitCount)
}

function buildProductReports(
  observations: ReportsObservationRow[],
  photos: ReportsSource['photos'],
): ProductReportRow[] {
  const observationMap = new Map(
    observations.map((row) => [row.id, row.product_name]),
  )
  const counts = new Map<
    string,
    { brand: string; category: string; observations: number; photos: number }
  >()

  for (const row of observations) {
    const current = counts.get(row.product_name) ?? {
      brand: row.brand,
      category: row.sub_category,
      observations: 0,
      photos: 0,
    }
    current.observations += 1
    counts.set(row.product_name, current)
  }

  for (const photo of photos) {
    const productName = photo.visit_observation_id
      ? observationMap.get(photo.visit_observation_id)
      : null

    if (!productName) {
      continue
    }

    const current = counts.get(productName)
    if (current) {
      current.photos += 1
    }
  }

  const sorted = [...counts.entries()].sort(
    (a, b) => b[1].observations - a[1].observations,
  )
  const mostNames = new Set(sorted.slice(0, 5).map(([name]) => name))
  const leastNames = new Set(sorted.slice(-5).map(([name]) => name))

  return sorted.map(([productName, data]) => ({
    productName,
    brand: data.brand,
    category: data.category,
    observations: data.observations,
    photoCount: data.photos,
    rank: mostNames.has(productName)
      ? 'most'
      : leastNames.has(productName)
        ? 'least'
        : 'neutral',
  }))
}

function buildPhotoReport(
  visits: ReportsVisitRow[],
  observations: ReportsObservationRow[],
  photos: ReportsSource['photos'],
  profileNames: Map<string, string>,
): PhotoReportData {
  const visitMap = new Map(visits.map((visit) => [visit.id, visit]))
  const observationProductMap = new Map(
    observations.map((row) => [row.id, row.product_name]),
  )

  const byVisitor = new Map<string, number>()
  const byBranch = new Map<string, number>()
  const byProduct = new Map<string, number>()
  const timeline = new Map<string, number>()
  const today = startOfDay(new Date())

  for (const photo of photos) {
    const visit = visitMap.get(photo.visit_id)
    if (!visit) {
      continue
    }

    byVisitor.set(visit.user_id, (byVisitor.get(visit.user_id) ?? 0) + 1)
    byBranch.set(visit.store_name, (byBranch.get(visit.store_name) ?? 0) + 1)

    const productName = photo.visit_observation_id
      ? observationProductMap.get(photo.visit_observation_id)
      : null

    if (productName) {
      byProduct.set(productName, (byProduct.get(productName) ?? 0) + 1)
    }

    const date = getVisitDate(visit)
    const label = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    timeline.set(label, (timeline.get(label) ?? 0) + 1)
  }

  const toChart = (
    entries: [string, number][],
    nameMap?: Map<string, string>,
  ) =>
    withColors(
      entries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, value]) => ({
          label: nameMap?.get(key) ?? key,
          value,
        })),
    )

  const timelinePoints: ReportChartPoint[] = []
  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = startOfDay(new Date(today.getTime() - offset * 86400000))
    const label = day.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    timelinePoints.push({ label, value: timeline.get(label) ?? 0 })
  }

  return {
    totalPhotos: photos.length,
    byVisitor: toChart([...byVisitor.entries()], profileNames),
    byBranch: toChart([...byBranch.entries()]),
    byProduct: toChart([...byProduct.entries()]),
    timeline: withColors(timelinePoints),
  }
}

function buildPeriods(
  visits: ReportsVisitRow[],
  bucket: 'day' | 'week' | 'month' | 'quarter' | 'year',
  count: number,
): PerformancePeriod[] {
  const completed = visits.filter((visit) => isCompletedStatus(visit.status))
  const now = new Date()
  const periods: PerformancePeriod[] = []

  for (let index = count - 1; index >= 0; index -= 1) {
    let start: Date
    let end: Date
    let label: string

    if (bucket === 'day') {
      start = startOfDay(new Date(now.getTime() - index * 86400000))
      end = endOfDay(start)
      label = start.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    } else if (bucket === 'week') {
      start = startOfWeek(new Date(now.getTime() - index * 7 * 86400000))
      end = endOfDay(new Date(start.getTime() + 6 * 86400000))
      label = start.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    } else if (bucket === 'month') {
      start = startOfDay(new Date(now.getFullYear(), now.getMonth() - index, 1))
      end = endOfDay(new Date(start.getFullYear(), start.getMonth() + 1, 0))
      label = start.toLocaleDateString(undefined, {
        month: 'short',
        year: '2-digit',
      })
    } else if (bucket === 'quarter') {
      const quarterOffset = index * 3
      start = startOfDay(
        new Date(now.getFullYear(), now.getMonth() - quarterOffset, 1),
      )
      end = endOfDay(new Date(start.getFullYear(), start.getMonth() + 3, 0))
      label = `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`
    } else {
      start = startOfDay(new Date(now.getFullYear() - index, 0, 1))
      end = endOfDay(new Date(start.getFullYear(), 11, 31))
      label = String(start.getFullYear())
    }

    const value = completed.filter((visit) => {
      const date = getVisitDate(visit)
      return date >= start && date <= end
    }).length

    periods.push({ label, visits: value, growthPercent: null })
  }

  for (let index = 1; index < periods.length; index += 1) {
    const previous = periods[index - 1].visits
    const current = periods[index].visits

    if (previous === 0) {
      periods[index].growthPercent = current > 0 ? 100 : 0
    } else {
      periods[index].growthPercent = Math.round(
        ((current - previous) / previous) * 100,
      )
    }
  }

  return periods
}

function buildPerformanceReport(
  visits: ReportsVisitRow[],
): PerformanceReportData {
  const daily = buildPeriods(visits, 'day', 14)
  const weekly = buildPeriods(visits, 'week', 12)
  const monthly = buildPeriods(visits, 'month', 12)
  const quarterly = buildPeriods(visits, 'quarter', 4)
  const yearly = buildPeriods(visits, 'year', 5)

  return {
    daily,
    weekly,
    monthly,
    quarterly,
    yearly,
    trendChart: withColors(
      monthly.map((period) => ({ label: period.label, value: period.visits })),
    ),
    growthChart: withColors(
      monthly.map((period) => ({
        label: period.label,
        value: period.growthPercent ?? 0,
      })),
    ),
  }
}

function buildFilterOptions(source: ReportsSource): ReportsFilterOptions {
  return {
    visitors: source.profiles
      .filter((profile) => canOwnVisits(profile))
      .map((profile) => ({
        id: profile.id,
        name: getReportsProfileName(profile),
      })),
    branches: source.stores.map((store) => ({
      id: store.id,
      name: store.name,
    })),
    brands: [
      ...new Set(source.observations.map((row) => row.brand).filter(Boolean)),
    ].sort(),
    categories: [
      ...new Set(
        source.observations.map((row) => row.sub_category).filter(Boolean),
      ),
    ].sort(),
    products: [
      ...new Set(
        source.observations.map((row) => row.product_name).filter(Boolean),
      ),
    ].sort(),
  }
}

export function buildReportsCenterData(
  source: ReportsSource,
  filters: ReportsFilters,
): ReportsCenterData {
  const visits = filterReportsVisits(source, filters)
  const visitIds = new Set(visits.map((visit) => visit.id))
  const observations = filterReportsObservations(
    source.observations,
    visitIds,
    filters,
  )
  const photos = source.photos.filter((photo) => visitIds.has(photo.visit_id))
  const profileNames = buildProfileMap(source)

  return {
    executive: buildExecutiveReport(
      visits,
      observations,
      photos,
      profileNames,
      filters,
    ),
    visitors: buildVisitorReports(
      visits,
      observations,
      photos,
      profileNames,
      filters,
    ),
    branches: buildBranchReports(source, visits, observations, photos, filters),
    products: buildProductReports(observations, photos),
    photos: buildPhotoReport(visits, observations, photos, profileNames),
    performance: buildPerformanceReport(visits),
    filterOptions: buildFilterOptions(source),
  }
}
