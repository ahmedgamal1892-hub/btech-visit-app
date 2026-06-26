import { useQuery } from '@tanstack/react-query'

import {
  fetchVisitHistory,
  fetchVisitHistoryVisitors,
} from '@/services/visits/visits-history.service'
import type { VisitHistoryFilters } from '@/types/visit-history'

import {
  DEFAULT_VISITS_HISTORY_PAGE_SIZE,
  VISITS_HISTORY_QUERY_KEY,
  VISITS_HISTORY_VISITORS_QUERY_KEY,
} from '../constants'

export function useVisitsHistory(filters: VisitHistoryFilters) {
  return useQuery({
    queryKey: [VISITS_HISTORY_QUERY_KEY, filters],
    queryFn: () => fetchVisitHistory(filters),
  })
}

export function useVisitHistoryVisitors(enabled = true) {
  return useQuery({
    queryKey: [VISITS_HISTORY_VISITORS_QUERY_KEY],
    queryFn: fetchVisitHistoryVisitors,
    enabled,
  })
}

export function createDefaultVisitHistoryFilters(): VisitHistoryFilters {
  return {
    search: '',
    branchId: 'all',
    visitorId: 'all',
    status: 'all',
    fromDate: '',
    toDate: '',
    sortBy: 'visit_date',
    sortDir: 'desc',
    page: 1,
    pageSize: DEFAULT_VISITS_HISTORY_PAGE_SIZE,
  }
}
