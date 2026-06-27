import { useQuery } from '@tanstack/react-query'

import {
  AUDIT_LOG_FILTER_OPTIONS_QUERY_KEY,
  AUDIT_LOGS_QUERY_KEY,
} from '@/features/audit/constants'
import { fetchAuditLogFilterOptions, fetchAuditLogs } from '@/services/audit'
import type { AuditLogFilters } from '@/types/audit'

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: [AUDIT_LOGS_QUERY_KEY, filters],
    queryFn: () => fetchAuditLogs(filters),
  })
}

export function useAuditLogFilterOptions() {
  return useQuery({
    queryKey: [AUDIT_LOG_FILTER_OPTIONS_QUERY_KEY],
    queryFn: fetchAuditLogFilterOptions,
  })
}

export function createDefaultAuditLogFilters(): AuditLogFilters {
  return {
    search: '',
    actorUserId: '',
    action: '',
    entityType: '',
    fromDate: '',
    toDate: '',
    page: 1,
    pageSize: 25,
  }
}
