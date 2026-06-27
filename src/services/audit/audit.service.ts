import { getSupabaseClient } from '@/services/supabase/client'
import type {
  AuditLogFilterOptions,
  AuditLogFilters,
  AuditLogResult,
  ClientAuditContext,
} from '@/types/audit'

type AuditLogRpcRow = {
  id: string
  created_at: string
  actor_user_id: string | null
  actor_username: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
}

type ListAuditLogsRpcResponse = {
  rows: AuditLogRpcRow[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
}

type ListAuditLogFilterOptionsResponse = {
  actions: string[]
  entity_types: string[]
  actors: Array<{
    id: string
    username: string
    full_name: string
  }>
}

function mapAuditLogRow(row: AuditLogRpcRow) {
  return {
    id: row.id,
    createdAt: row.created_at,
    actorUserId: row.actor_user_id,
    actorUsername: row.actor_username,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    details: row.details ?? {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
  }
}

function parseDateBoundary(
  value: string,
  boundary: 'start' | 'end',
): string | null {
  if (!value.trim()) {
    return null
  }

  const date = new Date(
    `${value}T${boundary === 'start' ? '00:00:00' : '23:59:59.999'}`,
  )
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

export function getClientAuditContext(): ClientAuditContext {
  return {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    ipAddress: null,
  }
}

export async function logClientAuditEvent(input: {
  action: 'User Login' | 'User Logout'
  entityName?: string | null
  details?: Record<string, unknown>
  context?: ClientAuditContext
}): Promise<void> {
  const supabase = getSupabaseClient()
  const context = input.context ?? getClientAuditContext()

  const { error } = await supabase.rpc('log_client_audit_event', {
    p_action: input.action,
    p_entity_type: 'auth',
    p_entity_id: null,
    p_entity_name: input.entityName ?? null,
    p_details: input.details ?? {},
    p_ip_address: context.ipAddress ?? null,
    p_user_agent: context.userAgent ?? null,
  })

  if (error) {
    console.error('[Audit Log]', error.message)
  }
}

export async function fetchAuditLogs(
  filters: AuditLogFilters,
): Promise<AuditLogResult> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('list_audit_logs', {
    p_search: filters.search.trim(),
    p_actor_user_id: filters.actorUserId || null,
    p_action: filters.action || null,
    p_entity_type: filters.entityType || null,
    p_from_date: parseDateBoundary(filters.fromDate, 'start'),
    p_to_date: parseDateBoundary(filters.toDate, 'end'),
    p_page: filters.page,
    p_page_size: filters.pageSize,
  })

  if (error) {
    throw new Error(error.message)
  }

  const payload = data as ListAuditLogsRpcResponse

  return {
    rows: (payload.rows ?? []).map(mapAuditLogRow),
    totalCount: payload.total_count ?? 0,
    page: payload.page ?? filters.page,
    pageSize: payload.page_size ?? filters.pageSize,
    totalPages: payload.total_pages ?? 1,
  }
}

export async function fetchAuditLogFilterOptions(): Promise<AuditLogFilterOptions> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('list_audit_log_filter_options')

  if (error) {
    throw new Error(error.message)
  }

  const payload = data as ListAuditLogFilterOptionsResponse

  return {
    actions: payload.actions ?? [],
    entityTypes: payload.entity_types ?? [],
    actors: (payload.actors ?? []).map((actor) => ({
      id: actor.id,
      username: actor.username,
      fullName: actor.full_name,
    })),
  }
}
