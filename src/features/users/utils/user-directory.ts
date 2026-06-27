import type { UserProfile } from '@/types/user'

import { buildUserEmail } from '../services/user-directory.service'
import type {
  EnterpriseUserRow,
  UserDirectoryFilters,
  UserDirectoryResult,
  UserSortField,
  UserVisitMetrics,
} from '../types/user-directory.types'

export function formatUserDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatUserDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString(undefined, {
    dateStyle: 'medium',
  })
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base' })
}

function compareDates(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  if (!left && !right) {
    return 0
  }

  if (!left) {
    return 1
  }

  if (!right) {
    return -1
  }

  return new Date(left).getTime() - new Date(right).getTime()
}

function compareNumbers(
  left: number | null | undefined,
  right: number | null | undefined,
): number {
  const normalizedLeft = left ?? -1
  const normalizedRight = right ?? -1
  return normalizedLeft - normalizedRight
}

export function sortEnterpriseUsers(
  users: EnterpriseUserRow[],
  sortBy: UserSortField,
  sortDir: UserDirectoryFilters['sortDir'],
): EnterpriseUserRow[] {
  const direction = sortDir === 'asc' ? 1 : -1

  return [...users].sort((left, right) => {
    let result = 0

    switch (sortBy) {
      case 'name':
        result = compareStrings(
          left.full_name.trim() || left.username,
          right.full_name.trim() || right.username,
        )
        break
      case 'created_at':
        result = compareDates(left.created_at, right.created_at)
        break
      case 'last_login':
        result = compareDates(left.lastLogin, right.lastLogin)
        break
      case 'visits_count':
        result = compareNumbers(left.totalVisits, right.totalVisits)
        break
      default:
        result = 0
    }

    if (result === 0) {
      result = compareStrings(left.username, right.username)
    }

    return result * direction
  })
}

export function paginateEnterpriseUsers(
  users: EnterpriseUserRow[],
  page: number,
  pageSize: number,
): UserDirectoryResult {
  const totalCount = users.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = (safePage - 1) * pageSize

  return {
    users: users.slice(start, start + pageSize),
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
  }
}

export function enrichUserProfiles(
  profiles: UserProfile[],
  visitMetrics: Map<string, UserVisitMetrics>,
  lastLoginByUser: Map<string, string>,
): EnterpriseUserRow[] {
  return profiles.map((profile) => {
    const metrics = visitMetrics.get(profile.id)

    return {
      ...profile,
      email: buildUserEmail(profile.username),
      totalVisits: metrics?.totalVisits ?? 0,
      lastVisitDate: metrics?.lastVisitDate ?? null,
      lastLogin: lastLoginByUser.get(profile.id) ?? null,
    }
  })
}

export function createDefaultUserDirectoryFilters(): UserDirectoryFilters {
  return {
    nameSearch: '',
    usernameSearch: '',
    role: 'all',
    isActive: 'all',
    sortBy: 'name',
    sortDir: 'asc',
    page: 1,
    pageSize: 10,
  }
}
