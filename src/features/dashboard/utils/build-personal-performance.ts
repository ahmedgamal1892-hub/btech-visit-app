import type {
  ExecutiveDashboardSource,
  DashboardVisitRow,
} from '../services/executive-dashboard.service'
import { getProfileDisplayName } from '../services/executive-dashboard.service'
import type { PersonalPerformance } from '../types/executive-dashboard.types'
import {
  endOfDay,
  formatDurationLabel,
  getVisitDate,
  getVisitDurationMinutes,
  startOfDay,
} from './dashboard-date-utils'

function countSubmittedVisitsInRange(
  visits: DashboardVisitRow[],
  from: Date,
  to: Date,
): number {
  return visits.filter((visit) => {
    if (visit.status !== 'Submitted') {
      return false
    }

    const date = getVisitDate(visit)
    return date >= from && date <= to
  }).length
}

function buildVisitorRankMap(visits: DashboardVisitRow[]): Map<string, number> {
  const counts = new Map<string, number>()

  for (const visit of visits) {
    if (visit.status !== 'Submitted') {
      continue
    }

    counts.set(visit.user_id, (counts.get(visit.user_id) ?? 0) + 1)
  }

  const sorted = [...counts.entries()].sort((left, right) => right[1] - left[1])
  const rankMap = new Map<string, number>()

  sorted.forEach(([userId], index) => {
    rankMap.set(userId, index + 1)
  })

  return rankMap
}

export function buildPersonalPerformance(
  source: ExecutiveDashboardSource,
  filteredVisits: DashboardVisitRow[],
  currentUserId: string,
): PersonalPerformance {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekStart = startOfDay(
    new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
  )
  const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))

  const userSubmittedVisits = source.visits.filter(
    (visit) => visit.user_id === currentUserId && visit.status === 'Submitted',
  )
  const userFilteredVisits = filteredVisits.filter(
    (visit) => visit.user_id === currentUserId && visit.status === 'Submitted',
  )
  const filteredVisitIds = new Set(userFilteredVisits.map((visit) => visit.id))

  const sortedVisits = [...userSubmittedVisits].sort(
    (left, right) =>
      getVisitDate(right).getTime() - getVisitDate(left).getTime(),
  )
  const lastVisit = sortedVisits[0]

  const durationMinutes = userSubmittedVisits
    .map(getVisitDurationMinutes)
    .filter((value): value is number => value !== null)
  const averageVisitDurationMinutes =
    durationMinutes.length > 0
      ? durationMinutes.reduce((sum, value) => sum + value, 0) /
        durationMinutes.length
      : null

  const rankMap = buildVisitorRankMap(
    filteredVisits.filter((visit) => visit.status === 'Submitted'),
  )

  return {
    visitsToday: countSubmittedVisitsInRange(
      userSubmittedVisits,
      todayStart,
      todayEnd,
    ),
    visitsThisWeek: countSubmittedVisitsInRange(
      userSubmittedVisits,
      weekStart,
      todayEnd,
    ),
    visitsThisMonth: countSubmittedVisitsInRange(
      userSubmittedVisits,
      monthStart,
      todayEnd,
    ),
    lastVisitDate: lastVisit
      ? (lastVisit.submitted_at ?? lastVisit.started_at)
      : null,
    lastBranchVisited: lastVisit?.store_name ?? null,
    totalPhotosUploaded: source.photos.filter((photo) =>
      filteredVisitIds.has(photo.visit_id),
    ).length,
    totalProductsChecked: source.observations.filter((row) =>
      filteredVisitIds.has(row.visit_id),
    ).length,
    averageVisitDurationMinutes,
    averageVisitDurationLabel:
      averageVisitDurationMinutes === null
        ? 'Not available'
        : formatDurationLabel(averageVisitDurationMinutes),
    currentRank: rankMap.get(currentUserId) ?? null,
    totalRankedVisitors: rankMap.size,
  }
}

export function getPersonalPerformanceDisplayName(
  source: ExecutiveDashboardSource,
  currentUserId: string,
): string {
  const profile = source.profiles.find((item) => item.id === currentUserId)
  return profile ? getProfileDisplayName(profile) : 'You'
}
