import { getSupabaseClient } from '@/services/supabase/client'
import {
  DELETED_USER_USERNAME,
  VISIT_OWNER_ROLES,
} from '@/lib/utils/visit-owners'
import type {
  VisitHistoryFilters,
  VisitHistoryResult,
  VisitHistoryRow,
  VisitHistoryVisitorOption,
} from '@/types/visit-history'

type VisitHistoryRpcRow = {
  visit_id: string
  visit_number: string | null
  visit_date: string
  branch_name: string
  branch_id: string | null
  visitor_id: string
  visitor_name: string
  inspection_items_count: number
  photos_count: number
  status: string
  review_decision: string | null
}

type VisitHistoryRpcResponse = {
  rows: VisitHistoryRpcRow[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
}

function mapRow(row: VisitHistoryRpcRow): VisitHistoryRow {
  return {
    visitId: row.visit_id,
    visitNumber: row.visit_number,
    visitDate: row.visit_date,
    branchName: row.branch_name,
    branchId: row.branch_id,
    visitorId: row.visitor_id,
    visitorName: row.visitor_name,
    inspectionItemsCount: row.inspection_items_count,
    photosCount: row.photos_count,
    status: row.status as VisitHistoryRow['status'],
    reviewDecision: row.review_decision as VisitHistoryRow['reviewDecision'],
  }
}

function normalizeOptionalId(value: string): string | null {
  return value && value !== 'all' ? value : null
}

function normalizeOptionalDate(value: string): string | null {
  return value.trim() ? value : null
}

export async function fetchVisitHistory(
  filters: VisitHistoryFilters,
): Promise<VisitHistoryResult> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('list_visit_history', {
    p_search: filters.search.trim() || null,
    p_store_id: normalizeOptionalId(filters.branchId),
    p_visitor_id: normalizeOptionalId(filters.visitorId),
    p_status: filters.status === 'all' ? null : filters.status,
    p_from_date: normalizeOptionalDate(filters.fromDate),
    p_to_date: normalizeOptionalDate(filters.toDate),
    p_sort_by: filters.sortBy,
    p_sort_dir: filters.sortDir,
    p_page: filters.page,
    p_page_size: filters.pageSize,
  })

  if (error) {
    throw new Error(error.message)
  }

  const payload = data as VisitHistoryRpcResponse

  return {
    rows: await enrichVisitHistoryDates((payload.rows ?? []).map(mapRow)),
    totalCount: payload.total_count ?? 0,
    page: payload.page ?? filters.page,
    pageSize: payload.page_size ?? filters.pageSize,
    totalPages: payload.total_pages ?? 1,
  }
}

async function enrichVisitHistoryDates(
  rows: VisitHistoryRow[],
): Promise<VisitHistoryRow[]> {
  if (rows.length === 0) {
    return rows
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('visits')
    .select('id, started_at')
    .in(
      'id',
      rows.map((row) => row.visitId),
    )

  if (error || !data) {
    return rows
  }

  const startedAtByVisitId = new Map(
    data.map((visit) => [visit.id, visit.started_at as string]),
  )

  return rows.map((row) => ({
    ...row,
    visitDate: startedAtByVisitId.get(row.visitId) ?? row.visitDate,
  }))
}

export async function fetchVisitHistoryVisitors(): Promise<
  VisitHistoryVisitorOption[]
> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, role, is_active')
    .in('role', [...VISIT_OWNER_ROLES])
    .eq('is_active', true)
    .neq('username', DELETED_USER_USERNAME)
    .order('full_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((profile) => ({
    id: profile.id,
    name:
      profile.full_name?.trim() ||
      profile.username?.trim() ||
      'Unknown visitor',
  }))
}
