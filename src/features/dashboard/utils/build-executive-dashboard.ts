import type {
  DashboardObservationRow,
  DashboardProfileRow,
  DashboardStoreRow,
  DashboardVisitRow,
  ExecutiveDashboardSource,
} from '../services/executive-dashboard.service'
import {
  getProfileDisplayName,
  isIssueStatusCode as checkIssueStatus,
} from '../services/executive-dashboard.service'
import { canOwnVisits } from '@/lib/utils/visit-owners'

import { getChartColor } from '../constants/chart-colors'
import { buildManagementInsights } from './build-management-insights'
import { buildPersonalPerformance } from './build-personal-performance'
import {
  endOfDay,
  getVisitDate,
  parseDateBoundary,
  startOfDay,
  startOfWeek,
} from './dashboard-date-utils'
import type {
  DashboardChartPoint,
  DashboardTrend,
  ExecutiveDashboardCharts,
  ExecutiveDashboardData,
  ExecutiveDashboardFilterOptions,
  ExecutiveDashboardFilters,
  ExecutiveDashboardKpis,
  ExecutiveDashboardTables,
  ExecutiveSummary,
  MostVisitedBranchRow,
  PersonalPerformance,
  RecentActivityRow,
  RecentVisitRow,
  TopVisitorRow,
  VisitorLeaderboardRow,
} from '../types/executive-dashboard.types'

function isWithinRange(
  date: Date,
  from: Date | null,
  to: Date | null,
): boolean {
  if (from && date < from) {
    return false
  }

  if (to && date > to) {
    return false
  }

  return true
}

function buildStoreGovernorateMap(
  stores: DashboardStoreRow[],
): Map<string, string> {
  return new Map(
    stores.map((store) => [
      store.id,
      store.budget_channel?.trim() || 'Unassigned',
    ]),
  )
}

function buildStatusCodeMap(
  statuses: ExecutiveDashboardSource['statuses'],
): Map<string, string> {
  return new Map(
    statuses.map((status) => [status.id, status.code.toLowerCase()]),
  )
}

function buildProfileNameMap(
  profiles: DashboardProfileRow[],
): Map<string, string> {
  return new Map(
    profiles.map((profile) => [profile.id, getProfileDisplayName(profile)]),
  )
}

export function filterExecutiveDashboardVisits(
  source: ExecutiveDashboardSource,
  filters: ExecutiveDashboardFilters,
): DashboardVisitRow[] {
  const from = parseDateBoundary(filters.fromDate, 'start')
  const to = parseDateBoundary(filters.toDate, 'end')
  const storeGovernorateMap = buildStoreGovernorateMap(source.stores)
  const observationVisitIdsByBrand =
    filters.brand === 'all'
      ? null
      : new Set(
          source.observations
            .filter((row) => row.brand === filters.brand)
            .map((row) => row.visit_id),
        )

  return source.visits.filter((visit) => {
    const visitDate = getVisitDate(visit)

    if (!isWithinRange(visitDate, from, to)) {
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

    if (filters.governorate !== 'all') {
      const governorate = visit.store_id
        ? storeGovernorateMap.get(visit.store_id)
        : 'Unassigned'

      if (governorate !== filters.governorate) {
        return false
      }
    }

    if (
      observationVisitIdsByBrand &&
      !observationVisitIdsByBrand.has(visit.id)
    ) {
      return false
    }

    return true
  })
}

function countTrend(current: number, previous: number): DashboardTrend {
  if (previous === 0 && current === 0) {
    return { label: 'No change', direction: 'neutral' }
  }

  if (previous === 0) {
    return { label: `+${current} vs prior period`, direction: 'up' }
  }

  const delta = current - previous
  const percent = Math.round((delta / previous) * 100)

  if (delta === 0) {
    return { label: 'No change', direction: 'neutral' }
  }

  return {
    label: `${delta > 0 ? '+' : ''}${percent}% vs prior period`,
    direction: delta > 0 ? 'up' : 'down',
  }
}

function withChartColors(points: DashboardChartPoint[]): DashboardChartPoint[] {
  return points.map((point, index) => ({
    ...point,
    color: point.color ?? getChartColor(index),
  }))
}

export function buildExecutiveSummary(
  source: ExecutiveDashboardSource,
  filteredVisits: DashboardVisitRow[],
): ExecutiveSummary {
  const submittedVisits = filteredVisits.filter(
    (visit) => visit.status === 'Submitted',
  )
  const visitedBranchIds = new Set(
    submittedVisits
      .map((visit) => visit.store_id)
      .filter((storeId): storeId is string => Boolean(storeId)),
  )

  const totalBranches = source.stores.length
  const visitedBranches = visitedBranchIds.size
  const remainingBranches = Math.max(totalBranches - visitedBranches, 0)
  const completionPercent =
    totalBranches > 0 ? Math.round((visitedBranches / totalBranches) * 100) : 0

  return {
    totalBranches,
    visitedBranches,
    remainingBranches,
    completionPercent,
  }
}

export function buildExecutiveDashboardKpis(
  source: ExecutiveDashboardSource,
  filteredVisits: DashboardVisitRow[],
): ExecutiveDashboardKpis {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekStart = startOfDay(
    new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
  )
  const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
  const previousWeekStart = startOfDay(
    new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000),
  )
  const previousWeekEnd = endOfDay(
    new Date(weekStart.getTime() - 24 * 60 * 60 * 1000),
  )
  const previousMonthStart = startOfDay(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
  )
  const previousMonthEnd = endOfDay(
    new Date(now.getFullYear(), now.getMonth(), 0),
  )

  const submittedVisits = filteredVisits.filter(
    (visit) => visit.status === 'Submitted',
  )
  const visitedBranchIds = new Set(
    submittedVisits
      .map((visit) => visit.store_id)
      .filter((storeId): storeId is string => Boolean(storeId)),
  )

  const totalBranches = source.stores.length
  const visitedBranches = visitedBranchIds.size
  const remainingBranches = Math.max(totalBranches - visitedBranches, 0)
  const completionPercent =
    totalBranches > 0 ? Math.round((visitedBranches / totalBranches) * 100) : 0

  const visitsToday = submittedVisits.filter((visit) => {
    const date = getVisitDate(visit)
    return date >= todayStart && date <= todayEnd
  }).length

  const visitsThisWeek = submittedVisits.filter(
    (visit) => getVisitDate(visit) >= weekStart,
  ).length

  const visitsThisMonth = submittedVisits.filter(
    (visit) => getVisitDate(visit) >= monthStart,
  ).length

  const previousWeekVisits = source.visits.filter((visit) => {
    if (visit.status !== 'Submitted') {
      return false
    }

    const date = getVisitDate(visit)
    return date >= previousWeekStart && date <= previousWeekEnd
  }).length

  const previousMonthVisits = source.visits.filter((visit) => {
    if (visit.status !== 'Submitted') {
      return false
    }

    const date = getVisitDate(visit)
    return date >= previousMonthStart && date <= previousMonthEnd
  }).length

  const filteredVisitIds = new Set(filteredVisits.map((visit) => visit.id))
  const statusCodeMap = buildStatusCodeMap(source.statuses)

  const filteredObservations = source.observations.filter((row) =>
    filteredVisitIds.has(row.visit_id),
  )
  const filteredPhotos = source.photos.filter((row) =>
    filteredVisitIds.has(row.visit_id),
  )

  const openIssues = filteredObservations.filter((row) => {
    const code = statusCodeMap.get(row.visit_status_id)
    return code ? checkIssueStatus(code) : false
  }).length

  const previousMonthIssues = source.observations.filter((row) => {
    const visit = source.visits.find((item) => item.id === row.visit_id)
    if (!visit || visit.status !== 'Submitted') {
      return false
    }

    const date = getVisitDate(visit)
    if (date < previousMonthStart || date > previousMonthEnd) {
      return false
    }

    const code = statusCodeMap.get(row.visit_status_id)
    return code ? checkIssueStatus(code) : false
  }).length

  return {
    totalBranches,
    visitedBranches,
    remainingBranches,
    completionPercent,
    visitsToday,
    visitsThisWeek,
    visitsThisMonth,
    totalProductsChecked: filteredObservations.length,
    totalPhotosUploaded: filteredPhotos.length,
    openIssues,
    trends: {
      visitsThisWeek: countTrend(visitsThisWeek, previousWeekVisits),
      visitsThisMonth: countTrend(visitsThisMonth, previousMonthVisits),
      openIssues: countTrend(openIssues, previousMonthIssues),
    },
  }
}

function buildVisitsPerDayChart(
  visits: DashboardVisitRow[],
): DashboardChartPoint[] {
  const today = startOfDay(new Date())
  const points: DashboardChartPoint[] = []

  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = startOfDay(
      new Date(today.getTime() - offset * 24 * 60 * 60 * 1000),
    )
    const dayEnd = endOfDay(day)
    const label = day.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    const value = visits.filter((visit) => {
      if (visit.status !== 'Submitted') {
        return false
      }

      const date = getVisitDate(visit)
      return date >= day && date <= dayEnd
    }).length

    points.push({ label, value })
  }

  return withChartColors(points)
}

function buildVisitsByVisitorChart(
  visits: DashboardVisitRow[],
  profileNames: Map<string, string>,
): DashboardChartPoint[] {
  const counts = new Map<string, number>()

  for (const visit of visits) {
    if (visit.status !== 'Submitted') {
      continue
    }

    counts.set(visit.user_id, (counts.get(visit.user_id) ?? 0) + 1)
  }

  return withChartColors(
    [...counts.entries()]
      .map(([userId, value]) => ({
        label: profileNames.get(userId) ?? 'Unknown visitor',
        value,
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 10),
  )
}

function buildVisitsByBranchChart(
  visits: DashboardVisitRow[],
): DashboardChartPoint[] {
  const counts = new Map<string, number>()

  for (const visit of visits) {
    if (visit.status !== 'Submitted') {
      continue
    }

    counts.set(visit.store_name, (counts.get(visit.store_name) ?? 0) + 1)
  }

  return withChartColors(
    [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 10),
  )
}

function buildVisitsPerWeekChart(
  visits: DashboardVisitRow[],
): DashboardChartPoint[] {
  const today = startOfDay(new Date())
  const points: DashboardChartPoint[] = []

  for (let offset = 11; offset >= 0; offset -= 1) {
    const weekStart = startOfWeek(
      new Date(today.getTime() - offset * 7 * 24 * 60 * 60 * 1000),
    )
    const weekEnd = endOfDay(
      new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    )
    const label = weekStart.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    const value = visits.filter((visit) => {
      if (visit.status !== 'Submitted') {
        return false
      }

      const date = getVisitDate(visit)
      return date >= weekStart && date <= weekEnd
    }).length

    points.push({ label, value })
  }

  return withChartColors(points)
}

function buildVisitsPerMonthChart(
  visits: DashboardVisitRow[],
): DashboardChartPoint[] {
  const today = new Date()
  const points: DashboardChartPoint[] = []

  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthDate = new Date(
      today.getFullYear(),
      today.getMonth() - offset,
      1,
    )
    const monthStart = startOfDay(monthDate)
    const monthEnd = endOfDay(
      new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0),
    )
    const label = monthStart.toLocaleDateString(undefined, {
      month: 'short',
      year: '2-digit',
    })
    const value = visits.filter((visit) => {
      if (visit.status !== 'Submitted') {
        return false
      }

      const date = getVisitDate(visit)
      return date >= monthStart && date <= monthEnd
    }).length

    points.push({ label, value })
  }

  return withChartColors(points)
}

function buildPhotoUploadTrendChart(
  source: ExecutiveDashboardSource,
  filteredVisitIds: Set<string>,
): DashboardChartPoint[] {
  const today = startOfDay(new Date())
  const visitDateMap = new Map(
    source.visits.map((visit) => [visit.id, getVisitDate(visit)]),
  )
  const points: DashboardChartPoint[] = []

  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = startOfDay(
      new Date(today.getTime() - offset * 24 * 60 * 60 * 1000),
    )
    const dayEnd = endOfDay(day)
    const label = day.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    const value = source.photos.filter((photo) => {
      if (!filteredVisitIds.has(photo.visit_id)) {
        return false
      }

      const visitDate = visitDateMap.get(photo.visit_id)
      return visitDate ? visitDate >= day && visitDate <= dayEnd : false
    }).length

    points.push({ label, value })
  }

  return withChartColors(points)
}

function buildVisitsByBrandChart(
  observations: DashboardObservationRow[],
  visitIds: Set<string>,
): DashboardChartPoint[] {
  const counts = new Map<string, number>()

  for (const row of observations) {
    if (!visitIds.has(row.visit_id)) {
      continue
    }

    counts.set(row.brand, (counts.get(row.brand) ?? 0) + 1)
  }

  return withChartColors(
    [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 10),
  )
}

export function buildExecutiveDashboardCharts(
  source: ExecutiveDashboardSource,
  filteredVisits: DashboardVisitRow[],
): ExecutiveDashboardCharts {
  const profileNames = buildProfileNameMap(source.profiles)
  const filteredVisitIds = new Set(filteredVisits.map((visit) => visit.id))

  return {
    visitsPerDay: buildVisitsPerDayChart(filteredVisits),
    visitsPerWeek: buildVisitsPerWeekChart(filteredVisits),
    visitsPerMonth: buildVisitsPerMonthChart(filteredVisits),
    visitsByVisitor: buildVisitsByVisitorChart(filteredVisits, profileNames),
    visitsByBranch: buildVisitsByBranchChart(filteredVisits),
    brandObservations: buildVisitsByBrandChart(
      source.observations,
      filteredVisitIds,
    ),
    photoUploadTrend: buildPhotoUploadTrendChart(source, filteredVisitIds),
  }
}

export function buildExecutiveDashboardTables(
  source: ExecutiveDashboardSource,
  filteredVisits: DashboardVisitRow[],
): ExecutiveDashboardTables {
  const profileNames = buildProfileNameMap(source.profiles)
  const submittedVisits = filteredVisits.filter(
    (visit) => visit.status === 'Submitted',
  )

  const visitorStats = new Map<
    string,
    { visits: number; lastVisitDate: string | null }
  >()

  for (const visit of submittedVisits) {
    const current = visitorStats.get(visit.user_id) ?? {
      visits: 0,
      lastVisitDate: null,
    }
    const visitDate = visit.started_at

    current.visits += 1

    if (
      !current.lastVisitDate ||
      new Date(visitDate).getTime() > new Date(current.lastVisitDate).getTime()
    ) {
      current.lastVisitDate = visitDate
    }

    visitorStats.set(visit.user_id, current)
  }

  const topVisitors: TopVisitorRow[] = [...visitorStats.entries()]
    .map(([userId, stats]) => ({
      userId,
      userName: profileNames.get(userId) ?? 'Unknown visitor',
      visits: stats.visits,
      lastVisitDate: stats.lastVisitDate,
    }))
    .sort((left, right) => right.visits - left.visits)

  const branchStats = new Map<
    string,
    { branchId: string | null; branchName: string; visits: number }
  >()

  for (const visit of submittedVisits) {
    const branchKey = visit.store_id ?? visit.store_name
    const current = branchStats.get(branchKey) ?? {
      branchId: visit.store_id,
      branchName: visit.store_name,
      visits: 0,
    }
    current.visits += 1
    branchStats.set(branchKey, current)
  }

  const mostVisitedBranches: MostVisitedBranchRow[] = [
    ...branchStats.values(),
  ].sort((left, right) => right.visits - left.visits)

  const recentVisits: RecentVisitRow[] = [...submittedVisits]
    .sort(
      (left, right) =>
        getVisitDate(right).getTime() - getVisitDate(left).getTime(),
    )
    .map((visit) => ({
      visitId: visit.id,
      visitDate: visit.started_at,
      branchName: visit.store_name,
      visitorName: profileNames.get(visit.user_id) ?? 'Unknown visitor',
      status: visit.status,
    }))

  const photosByVisit = new Map<string, number>()
  for (const photo of source.photos) {
    photosByVisit.set(
      photo.visit_id,
      (photosByVisit.get(photo.visit_id) ?? 0) + 1,
    )
  }

  const productsByVisit = new Map<string, number>()
  for (const row of source.observations) {
    productsByVisit.set(
      row.visit_id,
      (productsByVisit.get(row.visit_id) ?? 0) + 1,
    )
  }

  const leaderboardStats = new Map<
    string,
    {
      visits: number
      branchIds: Set<string>
      productsChecked: number
      photosUploaded: number
    }
  >()

  for (const visit of submittedVisits) {
    const current = leaderboardStats.get(visit.user_id) ?? {
      visits: 0,
      branchIds: new Set<string>(),
      productsChecked: 0,
      photosUploaded: 0,
    }

    current.visits += 1
    if (visit.store_id) {
      current.branchIds.add(visit.store_id)
    }

    leaderboardStats.set(visit.user_id, current)
  }

  for (const visit of submittedVisits) {
    const current = leaderboardStats.get(visit.user_id)
    if (!current) {
      continue
    }

    current.productsChecked += productsByVisit.get(visit.id) ?? 0
    current.photosUploaded += photosByVisit.get(visit.id) ?? 0
  }

  const leaderboard: VisitorLeaderboardRow[] = [...leaderboardStats.entries()]
    .map(([userId, stats]) => ({
      rank: 0,
      userId,
      visitorName: profileNames.get(userId) ?? 'Unknown visitor',
      visits: stats.visits,
      branchesCovered: stats.branchIds.size,
      productsChecked: stats.productsChecked,
      photosUploaded: stats.photosUploaded,
    }))
    .sort((left, right) => right.visits - left.visits)
    .slice(0, 10)
    .map((row, index) => ({ ...row, rank: index + 1 }))

  const recentActivity: RecentActivityRow[] = recentVisits
    .slice(0, 15)
    .map((visit) => ({
      visitId: visit.visitId,
      visitorName: visit.visitorName,
      branchName: visit.branchName,
      visitTime: visit.visitDate,
      status: visit.status,
      photoCount: photosByVisit.get(visit.visitId) ?? 0,
    }))

  return {
    topVisitors,
    mostVisitedBranches,
    recentVisits,
    leaderboard,
    recentActivity,
  }
}

export function buildExecutiveDashboardInsights(
  source: ExecutiveDashboardSource,
  filteredVisits: DashboardVisitRow[],
): ReturnType<typeof buildManagementInsights> {
  return buildManagementInsights(source, filteredVisits)
}

export function buildExecutiveDashboardFilterOptions(
  source: ExecutiveDashboardSource,
): ExecutiveDashboardFilterOptions {
  const governorates = [
    ...new Set(
      source.stores
        .map((store) => store.budget_channel?.trim() || 'Unassigned')
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right))

  const brands = [
    ...new Set(source.observations.map((row) => row.brand).filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right))

  return {
    visitors: source.profiles
      .filter((profile) => canOwnVisits(profile))
      .map((profile) => ({
        id: profile.id,
        name: getProfileDisplayName(profile),
      })),
    branches: source.stores.map((store) => ({
      id: store.id,
      name: store.name,
    })),
    governorates,
    brands,
  }
}

export function buildExecutiveDashboard(
  source: ExecutiveDashboardSource,
  filters: ExecutiveDashboardFilters,
  currentUserId?: string,
): ExecutiveDashboardData {
  const filteredVisits = filterExecutiveDashboardVisits(source, filters)
  const personalPerformance: PersonalPerformance | undefined = currentUserId
    ? buildPersonalPerformance(source, filteredVisits, currentUserId)
    : undefined

  return {
    summary: buildExecutiveSummary(source, filteredVisits),
    kpis: buildExecutiveDashboardKpis(source, filteredVisits),
    personalPerformance,
    charts: buildExecutiveDashboardCharts(source, filteredVisits),
    tables: buildExecutiveDashboardTables(source, filteredVisits),
    insights: buildExecutiveDashboardInsights(source, filteredVisits),
    filterOptions: buildExecutiveDashboardFilterOptions(source),
  }
}

export function createDefaultExecutiveDashboardFilters(): ExecutiveDashboardFilters {
  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - 29)

  const format = (date: Date) => date.toISOString().slice(0, 10)

  return {
    fromDate: format(from),
    toDate: format(today),
    visitorId: 'all',
    branchId: 'all',
    governorate: 'all',
    brand: 'all',
    status: 'Submitted',
  }
}

export function formatDashboardDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export function formatDashboardDateTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
