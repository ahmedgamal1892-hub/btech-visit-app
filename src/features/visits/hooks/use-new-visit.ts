import { useQuery } from '@tanstack/react-query'

import {
  loadBranchBrandPerformance,
  loadBranchProducts,
  loadBranches,
  loadVisitStatuses,
} from '@/services/visits'

import {
  BRANCHES_QUERY_KEY,
  BRANCH_BRAND_PERFORMANCE_QUERY_KEY,
  BRANCH_PRODUCTS_QUERY_KEY,
  VISIT_STATUSES_QUERY_KEY,
} from '../constants'

export function useBranches() {
  return useQuery({
    queryKey: [BRANCHES_QUERY_KEY],
    queryFn: loadBranches,
    staleTime: 60_000,
  })
}

export function useBranchProducts(branchId: string | null) {
  return useQuery({
    queryKey: [BRANCH_PRODUCTS_QUERY_KEY, branchId],
    queryFn: () => loadBranchProducts(branchId!),
    enabled: Boolean(branchId),
    staleTime: 30_000,
  })
}

export function useBranchBrandPerformance(branchId: string | null) {
  return useQuery({
    queryKey: [BRANCH_BRAND_PERFORMANCE_QUERY_KEY, branchId],
    queryFn: () => loadBranchBrandPerformance(branchId!),
    enabled: Boolean(branchId),
    staleTime: 30_000,
  })
}

export function useVisitStatuses() {
  return useQuery({
    queryKey: [VISIT_STATUSES_QUERY_KEY],
    queryFn: loadVisitStatuses,
    staleTime: 5 * 60_000,
  })
}
