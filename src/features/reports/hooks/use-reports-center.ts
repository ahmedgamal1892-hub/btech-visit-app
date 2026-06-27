import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { REPORTS_SOURCE_QUERY_KEY } from '../constants'
import { fetchReportsSource } from '../services/reports-source.service'
import type { ReportsFilters } from '../types/reports.types'
import { buildReportsCenterData } from '../utils/build-reports-center'

export function useReportsSource() {
  return useQuery({
    queryKey: [REPORTS_SOURCE_QUERY_KEY],
    queryFn: fetchReportsSource,
    staleTime: 60_000,
  })
}

export function useReportsCenter(filters: ReportsFilters) {
  const sourceQuery = useReportsSource()

  const data = useMemo(() => {
    if (!sourceQuery.data) {
      return undefined
    }

    return buildReportsCenterData(sourceQuery.data, filters)
  }, [filters, sourceQuery.data])

  return {
    data,
    filterOptions: data?.filterOptions ?? {
      visitors: [],
      branches: [],
      brands: [],
      categories: [],
      products: [],
    },
    isLoading: sourceQuery.isLoading,
    isFetching: sourceQuery.isFetching,
    isError: sourceQuery.isError,
    error: sourceQuery.error,
    refetch: sourceQuery.refetch,
  }
}
