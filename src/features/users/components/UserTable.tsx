import { KeyRound, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { canDeleteUser } from '@/features/users/utils/self-guards'
import type { UserProfile } from '@/types/user'

type UserTableProps = {
  users: UserProfile[]
  currentUserId?: string
  onEdit: (user: UserProfile) => void
  onResetPassword: (user: UserProfile) => void
  onDelete: (user: UserProfile) => void
}

function formatPhone(phone: string | null) {
  return phone?.trim() ? phone : '—'
}

function UserActions({
  user,
  currentUserId,
  onEdit,
  onResetPassword,
  onDelete,
}: {
  user: UserProfile
  currentUserId?: string
  onEdit: (user: UserProfile) => void
  onResetPassword: (user: UserProfile) => void
  onDelete: (user: UserProfile) => void
}) {
  const isCurrentUser = user.id === currentUserId
  const allowDelete = canDeleteUser(currentUserId, user.id)

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onEdit(user)}
      >
        <Pencil className="size-4" />
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onResetPassword(user)}
      >
        <KeyRound className="size-4" />
        Reset Password
      </Button>
      {allowDelete && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(user)}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      )}
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
  onDelete,
}: {
  user: UserProfile
  currentUserId?: string
  onEdit: (user: UserProfile) => void
  onResetPassword: (user: UserProfile) => void
  onDelete: (user: UserProfile) => void
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
          onDelete={onDelete}
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
  onDelete,
}: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No users found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search or filters.
        </p>
      </div>
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
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border/70 md:block">
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
                    onDelete={onDelete}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
