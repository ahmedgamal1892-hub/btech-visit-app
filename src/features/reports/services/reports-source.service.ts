import { getSupabaseClient } from '@/services/supabase/client'

export type ReportsStoreRow = {
  id: string
  name: string
  budget_channel: string | null
}

export type ReportsVisitRow = {
  id: string
  store_id: string | null
  user_id: string
  status: string
  submitted_at: string | null
  started_at: string
  store_name: string
  review_decision: string | null
}

export type ReportsProfileRow = {
  id: string
  full_name: string | null
  username: string
  role: string
  is_active: boolean
}

export type ReportsObservationRow = {
  id: string
  visit_id: string
  brand: string
  sub_category: string
  product_name: string
  item_code: string
  visit_status_id: string
}

export type ReportsPhotoRow = {
  visit_id: string
  visit_observation_id: string | null
}

export type ReportsStatusRow = {
  id: string
  code: string
  label: string
}

export type ReportsSource = {
  stores: ReportsStoreRow[]
  visits: ReportsVisitRow[]
  profiles: ReportsProfileRow[]
  observations: ReportsObservationRow[]
  photos: ReportsPhotoRow[]
  statuses: ReportsStatusRow[]
}

export async function fetchReportsSource(): Promise<ReportsSource> {
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
        'id, store_id, user_id, status, submitted_at, started_at, store_name, review_decision',
      )
      .order('submitted_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('profiles')
      .select('id, full_name, username, role, is_active')
      .neq('username', 'deleted-user')
      .order('full_name'),
    supabase
      .from('visit_observations')
      .select(
        'id, visit_id, brand, sub_category, product_name, item_code, visit_status_id',
      ),
    supabase
      .from('visit_photos')
      .select('visit_id, visit_observation_id')
      .eq('is_active', true),
    supabase.from('visit_statuses').select('id, code, label'),
  ])

  for (const result of [
    storesResult,
    visitsResult,
    profilesResult,
    observationsResult,
    photosResult,
    statusesResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message)
    }
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

export function getReportsProfileName(profile: ReportsProfileRow): string {
  return profile.full_name?.trim() || profile.username.trim() || 'Unknown user'
}
