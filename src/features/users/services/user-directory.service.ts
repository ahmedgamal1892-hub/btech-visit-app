import { getUserAuthEmail } from '@/services/users/users.service'
import { getSupabaseClient } from '@/services/supabase/client'
import type { UserProfile } from '@/types/user'

import type {
  UserDirectoryFilters,
  UserDirectoryStats,
  UserVisitMetrics,
} from '../types/user-directory.types'

const USER_PROFILE_COLUMNS =
  'id, full_name, username, role, phone, is_active, created_at, updated_at'

function sanitizeSearch(value: string): string {
  return value.trim().replace(/[%_]/g, '')
}

export async function fetchFilteredUserProfiles(
  filters: Omit<UserDirectoryFilters, 'page' | 'pageSize'>,
): Promise<UserProfile[]> {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('profiles')
    .select(USER_PROFILE_COLUMNS)
    .neq('username', 'deleted-user')

  const nameSearch = sanitizeSearch(filters.nameSearch)
  if (nameSearch) {
    query = query.ilike('full_name', `%${nameSearch}%`)
  }

  const usernameSearch = sanitizeSearch(filters.usernameSearch)
  if (usernameSearch) {
    query = query.ilike('username', `%${usernameSearch}%`)
  }

  if (filters.role !== 'all') {
    query = query.eq('role', filters.role)
  }

  if (filters.isActive === 'active') {
    query = query.eq('is_active', true)
  } else if (filters.isActive === 'inactive') {
    query = query.eq('is_active', false)
  }

  const { data, error } = await query.order('username', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as UserProfile[]
}

export async function fetchUserDirectoryStats(): Promise<UserDirectoryStats> {
  const supabase = getSupabaseClient()

  const [profilesResult, visitsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('role, is_active')
      .neq('username', 'deleted-user'),
    supabase
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Submitted'),
  ])

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message)
  }

  if (visitsResult.error) {
    throw new Error(visitsResult.error.message)
  }

  const profiles = profilesResult.data ?? []

  return {
    totalUsers: profiles.length,
    admins: profiles.filter((profile) => profile.role === 'Admin').length,
    visitors: profiles.filter((profile) => profile.role === 'Visitor').length,
    activeUsers: profiles.filter((profile) => profile.is_active).length,
    inactiveUsers: profiles.filter((profile) => !profile.is_active).length,
    totalVisits: visitsResult.count ?? 0,
  }
}

export async function fetchUserVisitMetricsMap(): Promise<
  Map<string, UserVisitMetrics>
> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('visits')
    .select('user_id, started_at, submitted_at')
    .eq('status', 'Submitted')

  if (error) {
    throw new Error(error.message)
  }

  const metrics = new Map<string, UserVisitMetrics>()

  for (const visit of data ?? []) {
    const visitorId = visit.user_id
    if (!visitorId) {
      continue
    }

    const visitDate = visit.started_at
    const current = metrics.get(visitorId) ?? {
      totalVisits: 0,
      lastVisitDate: null,
    }

    current.totalVisits += 1

    if (
      visitDate &&
      (!current.lastVisitDate ||
        new Date(visitDate).getTime() >
          new Date(current.lastVisitDate).getTime())
    ) {
      current.lastVisitDate = visitDate
    }

    metrics.set(visitorId, current)
  }

  return metrics
}

export async function fetchUserLastLoginMap(): Promise<Map<string, string>> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('audit_logs')
    .select('actor_user_id, created_at')
    .eq('action', 'User Login')
    .not('actor_user_id', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    return new Map()
  }

  const lastLoginByUser = new Map<string, string>()

  for (const entry of data ?? []) {
    const userId = entry.actor_user_id
    if (!userId || lastLoginByUser.has(userId)) {
      continue
    }

    lastLoginByUser.set(userId, entry.created_at)
  }

  return lastLoginByUser
}

export function buildUserEmail(username: string): string {
  return getUserAuthEmail(username)
}
