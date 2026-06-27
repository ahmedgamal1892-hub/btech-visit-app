import type {
  DashboardObservationRow,
  DashboardPhotoRow,
  DashboardVisitRow,
  ExecutiveDashboardSource,
} from '../services/executive-dashboard.service'
import {
  getProfileDisplayName,
  isIssueStatusCode,
} from '../services/executive-dashboard.service'
import type { DashboardInsight } from '../types/executive-dashboard.types'
import { getVisitDate, startOfDay } from './dashboard-date-utils'

function buildProfileNameMap(
  profiles: ExecutiveDashboardSource['profiles'],
): Map<string, string> {
  return new Map(
    profiles.map((profile) => [profile.id, getProfileDisplayName(profile)]),
  )
}

function buildStatusLabelMap(
  statuses: ExecutiveDashboardSource['statuses'],
): Map<string, string> {
  return new Map(
    statuses.map((status) => [status.id, status.code.replace(/_/g, ' ')]),
  )
}

function summarizeNames(names: string[], limit = 3): string {
  if (names.length === 0) {
    return 'None'
  }

  const preview = names.slice(0, limit).join(', ')
  return names.length > limit ? `${preview}…` : preview
}

export function buildManagementInsights(
  source: ExecutiveDashboardSource,
  filteredVisits: DashboardVisitRow[],
): DashboardInsight[] {
  const now = new Date()
  const thirtyDaysAgo = startOfDay(
    new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000),
  )
  const profileNames = buildProfileNameMap(source.profiles)
  const statusLabels = buildStatusLabelMap(source.statuses)
  const submittedVisits = filteredVisits.filter(
    (visit) => visit.status === 'Submitted',
  )
  const filteredVisitIds = new Set(filteredVisits.map((visit) => visit.id))

  const visitorCounts = new Map<string, number>()
  for (const visit of submittedVisits) {
    visitorCounts.set(
      visit.user_id,
      (visitorCounts.get(visit.user_id) ?? 0) + 1,
    )
  }

  const sortedVisitors = [...visitorCounts.entries()].sort(
    (left, right) => right[1] - left[1],
  )
  const mostActiveVisitor = sortedVisitors[0]
  const leastActiveVisitor = sortedVisitors.at(-1)

  const branchCounts = new Map<string, number>()
  for (const visit of submittedVisits) {
    branchCounts.set(
      visit.store_name,
      (branchCounts.get(visit.store_name) ?? 0) + 1,
    )
  }

  const sortedBranches = [...branchCounts.entries()].sort(
    (left, right) => right[1] - left[1],
  )
  const mostVisitedBranch = sortedBranches[0]
  const leastVisitedBranch = sortedBranches.at(-1)

  const everVisitedStoreIds = new Set(
    source.visits
      .filter((visit) => visit.status === 'Submitted' && visit.store_id)
      .map((visit) => visit.store_id)
      .filter((storeId): storeId is string => Boolean(storeId)),
  )
  const neverVisitedBranches = source.stores.filter(
    (store) => !everVisitedStoreIds.has(store.id),
  )

  const visitedStoreIdsLast30Days = new Set(
    source.visits
      .filter((visit) => {
        if (visit.status !== 'Submitted' || !visit.store_id) {
          return false
        }

        return getVisitDate(visit) >= thirtyDaysAgo
      })
      .map((visit) => visit.store_id)
      .filter((storeId): storeId is string => Boolean(storeId)),
  )
  const notVisited30Days = source.stores.filter(
    (store) => !visitedStoreIdsLast30Days.has(store.id),
  )

  const brandCounts = new Map<string, number>()
  for (const row of source.observations) {
    if (!filteredVisitIds.has(row.visit_id)) {
      continue
    }

    brandCounts.set(row.brand, (brandCounts.get(row.brand) ?? 0) + 1)
  }

  const sortedBrands = [...brandCounts.entries()].sort(
    (left, right) => right[1] - left[1],
  )
  const topBrand = sortedBrands[0]
  const lowestBrand = sortedBrands.at(-1)

  const observationProductMap = new Map(
    source.observations.map((row) => [row.id, row.product_name]),
  )
  const productPhotoCounts = countProductPhotos(
    source.photos,
    filteredVisitIds,
    observationProductMap,
  )
  const topPhotographedProduct = [...productPhotoCounts.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0]

  const issueCounts = countIssueObservations(
    source.observations,
    filteredVisitIds,
    source.statuses,
    statusLabels,
  )
  const topIssue = [...issueCounts.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0]

  return [
    {
      id: 'most-active-visitor',
      title: 'Most Active Visitor',
      value: mostActiveVisitor
        ? (profileNames.get(mostActiveVisitor[0]) ?? 'Unknown')
        : '—',
      description: mostActiveVisitor
        ? `${mostActiveVisitor[1]} visits in selected period`
        : 'No visitor activity in range',
    },
    {
      id: 'least-active-visitor',
      title: 'Least Active Visitor',
      value: leastActiveVisitor
        ? (profileNames.get(leastActiveVisitor[0]) ?? 'Unknown')
        : '—',
      description: leastActiveVisitor
        ? `${leastActiveVisitor[1]} visits in selected period`
        : 'No visitor activity in range',
    },
    {
      id: 'most-visited-branch',
      title: 'Most Visited Branch',
      value: mostVisitedBranch?.[0] ?? '—',
      description: mostVisitedBranch
        ? `${mostVisitedBranch[1]} visits in selected period`
        : 'No branch activity in range',
    },
    {
      id: 'least-visited-branch',
      title: 'Least Visited Branch',
      value: leastVisitedBranch?.[0] ?? '—',
      description: leastVisitedBranch
        ? `${leastVisitedBranch[1]} visits in selected period`
        : 'No branch activity in range',
    },
    {
      id: 'never-visited-branches',
      title: 'Branches Never Visited',
      value: String(neverVisitedBranches.length),
      description: summarizeNames(
        neverVisitedBranches.map((store) => store.name),
      ),
    },
    {
      id: 'not-visited-30-days',
      title: 'Not Visited in 30 Days',
      value: String(notVisited30Days.length),
      description: summarizeNames(notVisited30Days.map((store) => store.name)),
    },
    {
      id: 'top-brand',
      title: 'Highest Brand Observations',
      value: topBrand?.[0] ?? '—',
      description: topBrand
        ? `${topBrand[1]} observations in range`
        : 'No brand observations in range',
    },
    {
      id: 'lowest-brand',
      title: 'Lowest Brand Observations',
      value: lowestBrand?.[0] ?? '—',
      description: lowestBrand
        ? `${lowestBrand[1]} observations in range`
        : 'No brand observations in range',
    },
    {
      id: 'most-photographed-product',
      title: 'Most Photographed Product',
      value: topPhotographedProduct?.[0] ?? '—',
      description: topPhotographedProduct
        ? `${topPhotographedProduct[1]} photos in range`
        : 'No product photos in range',
    },
    {
      id: 'most-common-issue',
      title: 'Most Common Issue',
      value: topIssue?.[0] ?? '—',
      description: topIssue
        ? `${topIssue[1]} recorded observations`
        : 'No issues recorded in range',
    },
  ]
}

function countProductPhotos(
  photos: DashboardPhotoRow[],
  filteredVisitIds: Set<string>,
  observationProductMap: Map<string, string>,
): Map<string, number> {
  const counts = new Map<string, number>()

  for (const photo of photos) {
    if (!filteredVisitIds.has(photo.visit_id)) {
      continue
    }

    const productName = photo.visit_observation_id
      ? observationProductMap.get(photo.visit_observation_id)
      : null

    if (!productName) {
      continue
    }

    counts.set(productName, (counts.get(productName) ?? 0) + 1)
  }

  return counts
}

function countIssueObservations(
  observations: DashboardObservationRow[],
  filteredVisitIds: Set<string>,
  statuses: ExecutiveDashboardSource['statuses'],
  statusLabels: Map<string, string>,
): Map<string, number> {
  const statusCodeMap = new Map(
    statuses.map((status) => [status.id, status.code.toLowerCase()]),
  )
  const counts = new Map<string, number>()

  for (const row of observations) {
    if (!filteredVisitIds.has(row.visit_id)) {
      continue
    }

    const code = statusCodeMap.get(row.visit_status_id)
    if (!code || !isIssueStatusCode(code)) {
      continue
    }

    const label = statusLabels.get(row.visit_status_id) ?? code
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  return counts
}
