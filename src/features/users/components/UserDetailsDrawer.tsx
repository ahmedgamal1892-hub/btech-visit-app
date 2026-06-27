import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  ClipboardList,
  KeyRound,
  Mail,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react'

import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
  TableActionButton,
} from '@/components/ui/action-buttons'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
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
import { fetchVisitHistory } from '@/services/visits/visits-history.service'

type UserDetailsDrawerProps = {
  user: EnterpriseUserRow | null
  open: boolean
  currentUserId?: string
  onOpenChange: (open: boolean) => void
  onEdit: (user: EnterpriseUserRow) => void
  onResetPassword: (user: EnterpriseUserRow) => void
  onActivate: (user: EnterpriseUserRow) => void
  onDeactivate: (user: EnterpriseUserRow) => void
  onDelete: (user: EnterpriseUserRow) => void
  togglingUserId?: string | null
}

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: LucideIcon
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function RecentVisitsList({ visitorId }: { visitorId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-recent-visits', visitorId],
    queryFn: () =>
      fetchVisitHistory({
        search: '',
        branchId: 'all',
        visitorId,
        status: 'all',
        fromDate: '',
        toDate: '',
        sortBy: 'visit_date',
        sortDir: 'desc',
        page: 1,
        pageSize: 5,
      }),
    enabled: Boolean(visitorId),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
        Recent visits are unavailable right now.
      </p>
    )
  }

  if (!data || data.rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
        No submitted visits yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {data.rows.map((visit) => (
        <div
          key={visit.visitId}
          className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 transition-colors hover:border-primary/20"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">{visit.branchName}</p>
              <p className="text-sm text-muted-foreground">
                {visit.visitNumber ? `#${visit.visitNumber}` : 'Visit'} ·{' '}
                {formatUserDate(visit.visitDate)}
              </p>
            </div>
            <Badge variant="secondary">{visit.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

export function UserDetailsDrawer({
  user,
  open,
  currentUserId,
  onOpenChange,
  onEdit,
  onResetPassword,
  onActivate,
  onDeactivate,
  onDelete,
  togglingUserId,
}: UserDetailsDrawerProps) {
  if (!user) {
    return null
  }

  const displayName = getUserDisplayName(user.full_name, user.username)
  const isPlaceholder = isDeletedUserPlaceholder(user)
  const allowDelete = canDeleteUser(currentUserId, user)
  const allowToggleActive = canToggleUserActive(currentUserId, user)
  const isToggling = togglingUserId === user.id

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg lg:max-w-xl"
      >
        <SheetHeader className="border-b border-border/70 pb-4">
          <div className="flex items-start gap-4 pr-8">
            <UserAvatar
              fullName={user.full_name}
              username={user.username}
              className="size-14 text-base"
            />
            <div className="min-w-0 space-y-2">
              <SheetTitle className="truncate text-xl">
                {displayName}
              </SheetTitle>
              <SheetDescription>@{user.username}</SheetDescription>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={user.role === 'Admin' ? 'default' : 'secondary'}
                >
                  {user.role}
                </Badge>
                <Badge variant={user.is_active ? 'success' : 'destructive'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-2">
          <section className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Email" value={user.email} icon={Mail} />
            <DetailItem
              label="Created Date"
              value={formatUserDateTime(user.created_at)}
              icon={CalendarDays}
            />
            <DetailItem
              label="Last Login"
              value={formatUserDateTime(user.lastLogin)}
            />
            <DetailItem
              label="Total Visits"
              value={String(user.totalVisits ?? '—')}
              icon={ClipboardList}
            />
          </section>

          <Separator />

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Recent Visits
              </h3>
              <p className="text-sm text-muted-foreground">
                Latest submitted visits for this user.
              </p>
            </div>
            <RecentVisitsList visitorId={user.id} />
          </section>
        </div>

        {!isPlaceholder ? (
          <SheetFooter className="border-t border-border/70 pt-4">
            <div className="flex w-full flex-wrap gap-2">
              <PrimaryButton type="button" onClick={() => onEdit(user)}>
                <Pencil className="size-4" />
                Edit User
              </PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={() => onResetPassword(user)}
              >
                <KeyRound className="size-4" />
                Reset Password
              </SecondaryButton>
              {allowToggleActive ? (
                user.is_active ? (
                  <TableActionButton
                    icon={UserX}
                    label={isToggling ? 'Updating...' : 'Deactivate'}
                    disabled={isToggling}
                    onClick={() => onDeactivate(user)}
                  />
                ) : (
                  <TableActionButton
                    icon={UserCheck}
                    label={isToggling ? 'Updating...' : 'Activate'}
                    disabled={isToggling}
                    onClick={() => onActivate(user)}
                  />
                )
              ) : null}
              {allowDelete ? (
                <DangerButton type="button" onClick={() => onDelete(user)}>
                  <Trash2 className="size-4" />
                  Delete User
                </DangerButton>
              ) : null}
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
