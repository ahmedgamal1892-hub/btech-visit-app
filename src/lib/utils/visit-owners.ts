import type { UserRole } from '@/types/auth'

export const VISIT_OWNER_ROLES = [
  'Admin',
  'Visitor',
] as const satisfies readonly UserRole[]

export const DELETED_USER_USERNAME = 'deleted-user'

type VisitOwnerProfile = {
  role: string
  username: string
  is_active?: boolean | null
}

export function isDeletedUserProfile(
  profile: Pick<VisitOwnerProfile, 'username'>,
): boolean {
  return profile.username === DELETED_USER_USERNAME
}

export function canOwnVisits(profile: VisitOwnerProfile): boolean {
  if (isDeletedUserProfile(profile)) {
    return false
  }

  if (!VISIT_OWNER_ROLES.includes(profile.role as UserRole)) {
    return false
  }

  if (profile.is_active === false) {
    return false
  }

  return true
}

export function isVisitOwnerRole(role: string): role is UserRole {
  return VISIT_OWNER_ROLES.includes(role as UserRole)
}
