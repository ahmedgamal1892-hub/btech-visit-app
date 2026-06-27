import type { UpdateUserInput } from '@/types/user'
import type { UserRole } from '@/types/auth'
import type { UserProfile } from '@/types/user'

const DELETED_USER_USERNAME = 'deleted-user'

export function isDeletedUserPlaceholder(
  user: Pick<UserProfile, 'username'>,
): boolean {
  return user.username === DELETED_USER_USERNAME
}

export function validateSelfProfileEdit(
  currentUserId: string | undefined,
  targetUserId: string,
  currentRole: UserRole,
  input: UpdateUserInput,
): string | null {
  if (!currentUserId || currentUserId !== targetUserId) {
    return null
  }

  if (!input.isActive) {
    return 'You cannot deactivate your own account.'
  }

  if (currentRole === 'Admin' && input.role !== 'Admin') {
    return 'You cannot remove your own Admin role.'
  }

  return null
}

export function canDeleteUser(
  currentUserId: string | undefined,
  targetUser: Pick<UserProfile, 'id' | 'username'>,
): boolean {
  if (isDeletedUserPlaceholder(targetUser)) {
    return false
  }

  return Boolean(currentUserId && currentUserId !== targetUser.id)
}

export function canToggleUserActive(
  currentUserId: string | undefined,
  targetUser: Pick<UserProfile, 'id' | 'username'>,
): boolean {
  if (isDeletedUserPlaceholder(targetUser)) {
    return false
  }

  return Boolean(currentUserId && currentUserId !== targetUser.id)
}
