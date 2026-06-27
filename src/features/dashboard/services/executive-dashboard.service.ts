import { getSupabaseClient } from '@/services/supabase/client'

const ISSUE_STATUS_CODES = new Set(['delisted', 'dead', 'damaged'])

export type DashboardStoreRow = {
  id: string
  name: string
  budget_channel: string | null
}

export type DashboardVisitRow = {
  id: string
  store_id: string | null
  user_id: string
  status: string
  submitted_at: string | null
  started_at: string
  store_name: string
}

export type DashboardProfileRow = {
  id: string
  full_name: string | null
  username: string
  role: string
  is_active: boolean
}

export type DashboardObservationRow = {
  id: string
  visit_id: string
  brand: string
  visit_status_id: string
  product_name: string
}

export type DashboardPhotoRow = {
  visit_id: string
  visit_observation_id: string | null
}

export type DashboardStatusRow = {
  id: string
  code: string
}

export type ExecutiveDashboardSource = {
  stores: DashboardStoreRow[]
  visits: DashboardVisitRow[]
  profiles: DashboardProfileRow[]
  observations: DashboardObservationRow[]
  photos: DashboardPhotoRow[]
  statuses: DashboardStatusRow[]
}

export async function fetchExecutiveDashboardSource(): Promise<ExecutiveDashboardSource> {
  const supabase = getSupabaseClient()

  const [
    storesResult,
    visitsResult,
    profilesResult,
    observationsResult,
    photosResult,
    statusesResult,
  ] = await Promise.all([
    supabase.from('stores').select('id, name, budget_channel').order('name'),
    supabase
      .from('visits')
      .select(
        'id, store_id, user_id, status, submitted_at, started_at, store_name',
      )
      .order('submitted_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('profiles')
      .select('id, full_name, username, role, is_active')
      .neq('username', 'deleted-user')
      .order('full_name'),
    supabase
      .from('visit_observations')
      .select('id, visit_id, brand, visit_status_id, product_name'),
    supabase
      .from('visit_photos')
      .select('visit_id, visit_observation_id')
      .eq('is_active', true),
    supabase.from('visit_statuses').select('id, code'),
  ])

  if (storesResult.error) {
    throw new Error(storesResult.error.message)
  }

  if (visitsResult.error) {
    throw new Error(visitsResult.error.message)
  }

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message)
  }

  if (observationsResult.error) {
    throw new Error(observationsResult.error.message)
  }

  if (photosResult.error) {
    throw new Error(photosResult.error.message)
  }

  if (statusesResult.error) {
    throw new Error(statusesResult.error.message)
  }

  return {
    stores: storesResult.data ?? [],
    visits: visitsResult.data ?? [],
    profiles: profilesResult.data ?? [],
    observations: observationsResult.data ?? [],
    photos: photosResult.data ?? [],
    statuses: statusesResult.data ?? [],
  }
}

export function isIssueStatusCode(code: string): boolean {
  return ISSUE_STATUS_CODES.has(code.toLowerCase())
}

export function getProfileDisplayName(profile: DashboardProfileRow): string {
  return profile.full_name?.trim() || profile.username.trim() || 'Unknown user'
}
