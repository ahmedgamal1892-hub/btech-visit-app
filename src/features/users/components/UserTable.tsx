import { KeyRound, Pencil, Trash2, UserCheck, UserX } from 'lucide-react'

import { EmptyState } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { TableActionButton } from '@/components/ui/action-buttons'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  canDeleteUser,
  canToggleUserActive,
  isDeletedUserPlaceholder,
} from '@/features/users/utils/self-guards'
import type { UserProfile } from '@/types/user'

type UserTableProps = {
  users: UserProfile[]
  currentUserId?: string
  onEdit: (user: UserProfile) => void
  onResetPassword: (user: UserProfile) => void
  onToggleActive: (user: UserProfile) => void
  onDelete: (user: UserProfile) => void
  togglingUserId?: string | null
}

function formatPhone(phone: string | null) {
  return phone?.trim() ? phone : '—'
}

function UserActions({
  user,
  currentUserId,
  onEdit,
  onResetPassword,
  onToggleActive,
  onDelete,
  togglingUserId,
}: {
  user: UserProfile
  currentUserId?: string
  onEdit: (user: UserProfile) => void
  onResetPassword: (user: UserProfile) => void
  onToggleActive: (user: UserProfile) => void
  onDelete: (user: UserProfile) => void
  togglingUserId?: string | null
}) {
  const isCurrentUser = user.id === currentUserId
  const allowDelete = canDeleteUser(currentUserId, user)
  const allowToggleActive = canToggleUserActive(currentUserId, user)
  const isToggling = togglingUserId === user.id
  const isPlaceholder = isDeletedUserPlaceholder(user)

  if (isPlaceholder) {
    return (
      <p className="text-right text-xs text-muted-foreground">
        System placeholder account
      </p>
    )
  }

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <TableActionButton
        icon={Pencil}
        label="Edit"
        onClick={() => onEdit(user)}
      />
      <TableActionButton
        icon={KeyRound}
        label="Reset Password"
        onClick={() => onResetPassword(user)}
      />
      {allowToggleActive ? (
        <TableActionButton
          label={
            isToggling
              ? 'Updating...'
              : user.is_active
                ? 'Deactivate'
                : 'Activate'
          }
          icon={user.is_active ? UserX : UserCheck}
          disabled={isToggling}
          onClick={() => onToggleActive(user)}
        />
      ) : null}
      {allowDelete ? (
        <TableActionButton
          icon={Trash2}
          label="Delete"
          tone="danger"
          onClick={() => onDelete(user)}
        />
      ) : null}
      {isCurrentUser && (
        <p className="w-full text-right text-xs text-muted-foreground">
          Signed in as this user
        </p>
      )}
    </div>
  )
}

function UserCard({
  user,
  currentUserId,
  onEdit,
  onResetPassword,
  onToggleActive,
  onDelete,
  togglingUserId,
}: {
  user: UserProfile
  currentUserId?: string
  onEdit: (user: UserProfile) => void
  onResetPassword: (user: UserProfile) => void
  onToggleActive: (user: UserProfile) => void
  onDelete: (user: UserProfile) => void
  togglingUserId?: string | null
}) {
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {user.full_name.trim() || '—'}
          </p>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>
            {user.role}
          </Badge>
          <Badge variant={user.is_active ? 'success' : 'destructive'}>
            {user.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Phone: {formatPhone(user.phone)}
      </p>

      <div className="mt-4">
        <UserActions
          user={user}
          currentUserId={currentUserId}
          onEdit={onEdit}
          onResetPassword={onResetPassword}
          onToggleActive={onToggleActive}
          onDelete={onDelete}
          togglingUserId={togglingUserId}
        />
      </div>
    </div>
  )
}

export function UserTable({
  users,
  currentUserId,
  onEdit,
  onResetPassword,
  onToggleActive,
  onDelete,
  togglingUserId,
}: UserTableProps) {
  if (users.length === 0) {
    return (
      <EmptyState
        title="No users found"
        description="Try adjusting your search or filters to find users in the directory."
        useBrandLogo
      />
    )
  }

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            currentUserId={currentUserId}
            onEdit={onEdit}
            onResetPassword={onResetPassword}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
            togglingUserId={togglingUserId}
          />
        ))}
      </div>

      <TableContainer maxHeight="70vh" className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name.trim() || '—'}
                </TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === 'Admin' ? 'default' : 'secondary'}
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>{formatPhone(user.phone)}</TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? 'success' : 'destructive'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <UserActions
                    user={user}
                    currentUserId={currentUserId}
                    onEdit={onEdit}
                    onResetPassword={onResetPassword}
                    onToggleActive={onToggleActive}
                    onDelete={onDelete}
                    togglingUserId={togglingUserId}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}
