import { useQuery } from '@tanstack/react-query'

import {
  fetchFilteredUserProfiles,
  fetchUserDirectoryStats,
  fetchUserLastLoginMap,
  fetchUserVisitMetricsMap,
} from '../services/user-directory.service'
import type { UserDirectoryFilters } from '../types/user-directory.types'
import {
  enrichUserProfiles,
  paginateEnterpriseUsers,
  sortEnterpriseUsers,
} from '../utils/user-directory'

export const USER_DIRECTORY_STATS_KEY = 'user-directory-stats'
export const USER_DIRECTORY_METRICS_KEY = 'user-directory-metrics'
export const USER_DIRECTORY_LAST_LOGIN_KEY = 'user-directory-last-login'
export const USER_DIRECTORY_ROWS_KEY = 'user-directory-rows'

export function useUserDirectoryStats() {
  return useQuery({
    queryKey: [USER_DIRECTORY_STATS_KEY],
    queryFn: fetchUserDirectoryStats,
  })
}

export function useUserDirectoryMetrics() {
  return useQuery({
    queryKey: [USER_DIRECTORY_METRICS_KEY],
    queryFn: fetchUserVisitMetricsMap,
  })
}

export function useUserLastLoginMap() {
  return useQuery({
    queryKey: [USER_DIRECTORY_LAST_LOGIN_KEY],
    queryFn: fetchUserLastLoginMap,
  })
}

export function useUserDirectory(filters: UserDirectoryFilters) {
  const listFilters = {
    nameSearch: filters.nameSearch,
    usernameSearch: filters.usernameSearch,
    role: filters.role,
    isActive: filters.isActive,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  }

  const profilesQuery = useQuery({
    queryKey: [USER_DIRECTORY_ROWS_KEY, listFilters],
    queryFn: () => fetchFilteredUserProfiles(listFilters),
  })

  const metricsQuery = useUserDirectoryMetrics()
  const lastLoginQuery = useUserLastLoginMap()

  const isLoading =
    profilesQuery.isLoading ||
    metricsQuery.isLoading ||
    lastLoginQuery.isLoading

  const isError =
    profilesQuery.isError || metricsQuery.isError || lastLoginQuery.isError

  const error =
    profilesQuery.error ?? metricsQuery.error ?? lastLoginQuery.error ?? null

  if (!profilesQuery.data || !metricsQuery.data || !lastLoginQuery.data) {
    return {
      data: undefined,
      isLoading,
      isFetching:
        profilesQuery.isFetching ||
        metricsQuery.isFetching ||
        lastLoginQuery.isFetching,
      isError,
      error,
      refetch: () => {
        void profilesQuery.refetch()
        void metricsQuery.refetch()
        void lastLoginQuery.refetch()
      },
    }
  }

  const enriched = enrichUserProfiles(
    profilesQuery.data,
    metricsQuery.data,
    lastLoginQuery.data,
  )
  const sorted = sortEnterpriseUsers(enriched, filters.sortBy, filters.sortDir)
  const paginated = paginateEnterpriseUsers(
    sorted,
    filters.page,
    filters.pageSize,
  )

  return {
    data: paginated,
    isLoading,
    isFetching:
      profilesQuery.isFetching ||
      metricsQuery.isFetching ||
      lastLoginQuery.isFetching,
    isError,
    error,
    refetch: () => {
      void profilesQuery.refetch()
      void metricsQuery.refetch()
      void lastLoginQuery.refetch()
    },
  }
}

export function userDirectoryQueryKeys() {
  return [
    USER_DIRECTORY_STATS_KEY,
    USER_DIRECTORY_METRICS_KEY,
    USER_DIRECTORY_LAST_LOGIN_KEY,
    USER_DIRECTORY_ROWS_KEY,
  ]
}
