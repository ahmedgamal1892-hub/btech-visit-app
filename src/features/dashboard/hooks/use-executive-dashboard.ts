import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { EXECUTIVE_DASHBOARD_QUERY_KEY } from '../constants'
import { fetchExecutiveDashboardSource } from '../services/executive-dashboard.service'
import type { ExecutiveDashboardFilters } from '../types/executive-dashboard.types'
import {
  buildExecutiveDashboardCharts,
  buildExecutiveDashboardFilterOptions,
  buildExecutiveDashboardInsights,
  buildExecutiveDashboardKpis,
  buildExecutiveDashboardTables,
  buildExecutiveSummary,
  filterExecutiveDashboardVisits,
} from '../utils/build-executive-dashboard'
import { buildPersonalPerformance } from '../utils/build-personal-performance'

export function useExecutiveDashboardSource() {
  return useQuery({
    queryKey: [EXECUTIVE_DASHBOARD_QUERY_KEY],
    queryFn: fetchExecutiveDashboardSource,
    staleTime: 60_000,
  })
}

export function useExecutiveDashboard(
  filters: ExecutiveDashboardFilters,
  currentUserId?: string,
) {
  const sourceQuery = useExecutiveDashboardSource()

  const filteredVisits = useMemo(() => {
    if (!sourceQuery.data) {
      return []
    }

    return filterExecutiveDashboardVisits(sourceQuery.data, filters)
  }, [filters, sourceQuery.data])

  const filterOptions = useMemo(() => {
    if (!sourceQuery.data) {
      return {
        visitors: [],
        branches: [],
        governorates: [],
        brands: [],
      }
    }

    return buildExecutiveDashboardFilterOptions(sourceQuery.data)
  }, [sourceQuery.data])

  const summary = useMemo(() => {
    if (!sourceQuery.data) {
      return undefined
    }

    return buildExecutiveSummary(sourceQuery.data, filteredVisits)
  }, [filteredVisits, sourceQuery.data])

  const kpis = useMemo(() => {
    if (!sourceQuery.data) {
      return undefined
    }

    return buildExecutiveDashboardKpis(sourceQuery.data, filteredVisits)
  }, [filteredVisits, sourceQuery.data])

  const personalPerformance = useMemo(() => {
    if (!sourceQuery.data || !currentUserId) {
      return undefined
    }

    return buildPersonalPerformance(
      sourceQuery.data,
      filteredVisits,
      currentUserId,
    )
  }, [currentUserId, filteredVisits, sourceQuery.data])

  const charts = useMemo(() => {
    if (!sourceQuery.data) {
      return undefined
    }

    return buildExecutiveDashboardCharts(sourceQuery.data, filteredVisits)
  }, [filteredVisits, sourceQuery.data])

  const tables = useMemo(() => {
    if (!sourceQuery.data) {
      return undefined
    }

    return buildExecutiveDashboardTables(sourceQuery.data, filteredVisits)
  }, [filteredVisits, sourceQuery.data])

  const insights = useMemo(() => {
    if (!sourceQuery.data) {
      return undefined
    }

    return buildExecutiveDashboardInsights(sourceQuery.data, filteredVisits)
  }, [filteredVisits, sourceQuery.data])

  const data = useMemo(() => {
    if (!summary || !kpis || !charts || !tables || !insights) {
      return undefined
    }

    return {
      summary,
      kpis,
      personalPerformance,
      charts,
      tables,
      insights,
      filterOptions,
    }
  }, [
    charts,
    filterOptions,
    insights,
    kpis,
    personalPerformance,
    summary,
    tables,
  ])

  return {
    data,
    summary,
    kpis,
    personalPerformance,
    charts,
    tables,
    insights,
    filterOptions,
    isLoading: sourceQuery.isLoading,
    isFetching: sourceQuery.isFetching,
    isError: sourceQuery.isError,
    error: sourceQuery.error,
    lastUpdatedAt: sourceQuery.dataUpdatedAt,
    refetch: sourceQuery.refetch,
  }
}
