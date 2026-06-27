import type { UserProfile } from '@/types/user'

export type UserSortField =
  | 'name'
  | 'created_at'
  | 'last_login'
  | 'visits_count'

export type UserSortDirection = 'asc' | 'desc'

export type UserDirectoryFilters = {
  nameSearch: string
  usernameSearch: string
  role: UserProfile['role'] | 'all'
  isActive: 'all' | 'active' | 'inactive'
  sortBy: UserSortField
  sortDir: UserSortDirection
  page: number
  pageSize: number
}

export type UserVisitMetrics = {
  totalVisits: number
  lastVisitDate: string | null
}

export type EnterpriseUserRow = UserProfile & {
  email: string
  totalVisits: number | null
  lastVisitDate: string | null
  lastLogin: string | null
}

export type UserDirectoryStats = {
  totalUsers: number
  admins: number
  visitors: number
  activeUsers: number
  inactiveUsers: number
  totalVisits: number
}

export type UserDirectoryResult = {
  users: EnterpriseUserRow[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}
