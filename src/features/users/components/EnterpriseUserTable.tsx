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
import { UserAvatar } from '@/features/users/components/UserAvatar'
import type { EnterpriseUserRow } from '@/features/users/types/user-directory.types'
import {
  canDeleteUser,
  canToggleUserActive,
  isDeletedUserPlaceholder,
} from '@/features/users/utils/self-guards'
import {
  formatUserDate,
  formatUserDateTime,
} from '@/features/users/utils/user-directory'
import { getUserDisplayName } from '@/lib/utils/user-display'
import { cn } from '@/lib/utils'

type EnterpriseUserTableProps = {
  users: EnterpriseUserRow[]
  currentUserId?: string
  onSelectUser: (user: EnterpriseUserRow) => void
  onEdit: (user: EnterpriseUserRow) => void
  onResetPassword: (user: EnterpriseUserRow) => void
  onActivate: (user: EnterpriseUserRow) => void
  onDeactivate: (user: EnterpriseUserRow) => void
  onDelete: (user: EnterpriseUserRow) => void
  togglingUserId?: string | null
}

function RoleBadge({ role }: { role: EnterpriseUserRow['role'] }) {
  return (
    <Badge variant={role === 'Admin' ? 'default' : 'secondary'}>{role}</Badge>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'success' : 'destructive'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  )
}

function UserRowActions({
  user,
  currentUserId,
  onEdit,
  onResetPassword,
  onActivate,
  onDeactivate,
  onDelete,
  togglingUserId,
}: {
  user: EnterpriseUserRow
  currentUserId?: string
  onEdit: (user: EnterpriseUserRow) => void
  onResetPassword: (user: EnterpriseUserRow) => void
  onActivate: (user: EnterpriseUserRow) => void
  onDeactivate: (user: EnterpriseUserRow) => void
  onDelete: (user: EnterpriseUserRow) => void
  togglingUserId?: string | null
}) {
  const allowDelete = canDeleteUser(currentUserId, user)
  const allowToggleActive = canToggleUserActive(currentUserId, user)
  const isToggling = togglingUserId === user.id
  const isPlaceholder = isDeletedUserPlaceholder(user)

  if (isPlaceholder) {
    return (
      <p className="text-right text-xs text-muted-foreground">
        System placeholder
      </p>
    )
  }

  return (
    <div
      className="flex flex-wrap justify-end gap-1.5"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
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
        user.is_active ? (
          <TableActionButton
            label={isToggling ? 'Updating...' : 'Deactivate'}
            icon={UserX}
            disabled={isToggling}
            onClick={() => onDeactivate(user)}
          />
        ) : (
          <TableActionButton
            label={isToggling ? 'Updating...' : 'Activate'}
            icon={UserCheck}
            disabled={isToggling}
            onClick={() => onActivate(user)}
          />
        )
      ) : null}
      {allowDelete ? (
        <TableActionButton
          icon={Trash2}
          label="Delete"
          tone="danger"
          onClick={() => onDelete(user)}
        />
      ) : null}
    </div>
  )
}

function UserMobileCard({
  user,
  currentUserId,
  onSelectUser,
  onEdit,
  onResetPassword,
  onActivate,
  onDeactivate,
  onDelete,
  togglingUserId,
}: {
  user: EnterpriseUserRow
  currentUserId?: string
  onSelectUser: (user: EnterpriseUserRow) => void
  onEdit: (user: EnterpriseUserRow) => void
  onResetPassword: (user: EnterpriseUserRow) => void
  onActivate: (user: EnterpriseUserRow) => void
  onDeactivate: (user: EnterpriseUserRow) => void
  onDelete: (user: EnterpriseUserRow) => void
  togglingUserId?: string | null
}) {
  const displayName = getUserDisplayName(user.full_name, user.username)

  return (
    <button
      type="button"
      onClick={() => onSelectUser(user)}
      className="w-full rounded-2xl border border-border/70 bg-card p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <UserAvatar fullName={user.full_name} username={user.username} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {displayName}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                @{user.username}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <RoleBadge role={user.role} />
              <StatusBadge isActive={user.is_active} />
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Visits</dt>
              <dd className="font-medium tabular-nums">
                {user.totalVisits ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last login</dt>
              <dd className="font-medium">
                {formatUserDateTime(user.lastLogin)}
              </dd>
            </div>
          </dl>

          <div
            className="mt-4 flex flex-wrap gap-2"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
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
            {canToggleUserActive(currentUserId, user) ? (
              user.is_active ? (
                <TableActionButton
                  icon={UserX}
                  label="Deactivate"
                  disabled={togglingUserId === user.id}
                  onClick={() => onDeactivate(user)}
                />
              ) : (
                <TableActionButton
                  icon={UserCheck}
                  label="Activate"
                  disabled={togglingUserId === user.id}
                  onClick={() => onActivate(user)}
                />
              )
            ) : null}
            {canDeleteUser(currentUserId, user) ? (
              <TableActionButton
                icon={Trash2}
                label="Delete"
                tone="danger"
                onClick={() => onDelete(user)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </button>
  )
}

export function EnterpriseUserTable({
  users,
  currentUserId,
  onSelectUser,
  onEdit,
  onResetPassword,
  onActivate,
  onDeactivate,
  onDelete,
  togglingUserId,
}: EnterpriseUserTableProps) {
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
          <UserMobileCard
            key={user.id}
            user={user}
            currentUserId={currentUserId}
            onSelectUser={onSelectUser}
            onEdit={onEdit}
            onResetPassword={onResetPassword}
            onActivate={onActivate}
            onDeactivate={onDeactivate}
            onDelete={onDelete}
            togglingUserId={togglingUserId}
          />
        ))}
      </div>

      <TableContainer maxHeight="70vh" className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Avatar</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Visits</TableHead>
              <TableHead>Last Visit Date</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const displayName = getUserDisplayName(
                user.full_name,
                user.username,
              )

              return (
                <TableRow
                  key={user.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted/40',
                  )}
                  onClick={() => onSelectUser(user)}
                >
                  <TableCell>
                    <UserAvatar
                      fullName={user.full_name}
                      username={user.username}
                      className="size-9"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{displayName}</TableCell>
                  <TableCell>@{user.username}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge isActive={user.is_active} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {user.totalVisits ?? '—'}
                  </TableCell>
                  <TableCell>{formatUserDate(user.lastVisitDate)}</TableCell>
                  <TableCell>{formatUserDateTime(user.lastLogin)}</TableCell>
                  <TableCell>{formatUserDate(user.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <UserRowActions
                      user={user}
                      currentUserId={currentUserId}
                      onEdit={onEdit}
                      onResetPassword={onResetPassword}
                      onActivate={onActivate}
                      onDeactivate={onDeactivate}
                      onDelete={onDelete}
                      togglingUserId={togglingUserId}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}
