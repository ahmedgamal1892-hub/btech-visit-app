import type { UpdateUserInput } from '@/types/user'
import type { UserRole } from '@/types/auth'

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
  targetUserId: string,
): boolean {
  return Boolean(currentUserId && currentUserId !== targetUserId)
}
