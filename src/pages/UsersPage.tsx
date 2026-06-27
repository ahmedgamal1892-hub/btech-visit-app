import { Loader2, Plus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { AlertBanner, PageHeader } from '@/components/common'
import { PrimaryButton } from '@/components/ui/action-buttons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import {
  AddUserDialog,
  DeactivateUserDialog,
  DeleteUserDialog,
  EditUserDialog,
  EnterpriseUserTable,
  ResetPasswordDialog,
  UserDetailsDrawer,
  UserManagementFilters,
  UserStatsCards,
  UserTableSkeleton,
} from '@/features/users/components'
import {
  createDefaultUserDirectoryFilters,
  useCreateUser,
  useDeleteUser,
  useResetUserPassword,
  useSetUserActive,
  useUpdateUser,
  useUserDirectory,
  useUserDirectoryStats,
} from '@/features/users/hooks'
import {
  canDeleteUser,
  validateSelfProfileEdit,
} from '@/features/users/utils/self-guards'
import { useAuth, useDebouncedValue } from '@/hooks'
import type {
  CreateUserFormValues,
  ResetPasswordFormValues,
  UpdateUserFormValues,
} from '@/lib/validations/users'
import type { EnterpriseUserRow } from '@/features/users/types/user-directory.types'
import type { UserDirectoryFilters } from '@/features/users/types/user-directory.types'
import type { UserProfile } from '@/types/user'

export function UsersPage() {
  const { user, isLoading: isAuthLoading, isAdmin, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [filters, setFilters] = useState<UserDirectoryFilters>(() =>
    createDefaultUserDirectoryFilters(),
  )
  const debouncedNameSearch = useDebouncedValue(filters.nameSearch, 300)
  const debouncedUsernameSearch = useDebouncedValue(filters.usernameSearch, 300)

  const queryFilters = useMemo<UserDirectoryFilters>(
    () => ({
      ...filters,
      nameSearch: debouncedNameSearch,
      usernameSearch: debouncedUsernameSearch,
    }),
    [filters, debouncedNameSearch, debouncedUsernameSearch],
  )

  const { data: stats, isLoading: isStatsLoading } = useUserDirectoryStats()
  const { data, isLoading, isError, error } = useUserDirectory(queryFilters)
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const resetPasswordMutation = useResetUserPassword()
  const setUserActiveMutation = useSetUserActive()
  const deleteUserMutation = useDeleteUser()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<EnterpriseUserRow | null>(
    null,
  )
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [resetUser, setResetUser] = useState<UserProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)
  const [deactivateTarget, setDeactivateTarget] =
    useState<EnterpriseUserRow | null>(null)
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)

  const paginationLabel = useMemo(() => {
    if (!data || data.totalCount === 0) {
      return '0 users'
    }

    const start = (data.page - 1) * data.pageSize + 1
    const end = Math.min(data.page * data.pageSize, data.totalCount)
    return `${start}-${end} of ${data.totalCount} users`
  }, [data])

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading users...
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  const handleCreateUser = async (values: CreateUserFormValues) => {
    const result = await createUserMutation.mutateAsync({
      fullName: values.fullName,
      username: values.username,
      password: values.password,
      phone: values.phone,
      role: values.role,
      isActive: values.isActive,
    })

    if (!result.success) {
      toast({
        variant: 'error',
        title: 'Could not create user',
        description: result.message,
      })
      return
    }

    toast({
      variant: 'success',
      title: 'User created',
      description: `${values.username} was added successfully.`,
    })
    setIsAddOpen(false)
  }

  const handleUpdateUser = async (values: UpdateUserFormValues) => {
    if (!editingUser) {
      return
    }

    const selfEditError = validateSelfProfileEdit(
      user?.id,
      editingUser.id,
      editingUser.role,
      {
        fullName: values.fullName,
        phone: values.phone,
        role: values.role,
        isActive: values.isActive,
      },
    )

    if (selfEditError) {
      toast({
        variant: 'error',
        title: 'Update not allowed',
        description: selfEditError,
      })
      return
    }

    const result = await updateUserMutation.mutateAsync({
      userId: editingUser.id,
      input: {
        fullName: values.fullName,
        phone: values.phone,
        role: values.role,
        isActive: values.isActive,
      },
    })

    if (!result.success) {
      toast({
        variant: 'error',
        title: 'Could not update user',
        description: result.message,
      })
      return
    }

    if (editingUser.id === user?.id) {
      await refreshProfile()
    }

    toast({
      variant: 'success',
      title: 'User updated',
      description: `${editingUser.username} was updated successfully.`,
    })
    setEditingUser(null)
  }

  const handleResetPassword = async (values: ResetPasswordFormValues) => {
    if (!resetUser) {
      return
    }

    const result = await resetPasswordMutation.mutateAsync({
      userId: resetUser.id,
      mode: 'set',
      password: values.password,
    })

    if (!result.success) {
      toast({
        variant: 'error',
        title: 'Could not reset password',
        description: result.message,
      })
      return
    }

    toast({
      variant: 'success',
      title: 'Password reset',
      description: `Password updated for ${resetUser.username}.`,
    })
    setResetUser(null)
  }

  const handleSendResetEmail = async () => {
    if (!resetUser) {
      return
    }

    const result = await resetPasswordMutation.mutateAsync({
      userId: resetUser.id,
      mode: 'email',
    })

    if (!result.success) {
      toast({
        variant: 'error',
        title: 'Could not send reset email',
        description: result.message,
      })
      return
    }

    toast({
      variant: 'success',
      title: 'Reset email sent',
      description: `A password reset link was sent for ${resetUser.username}.`,
    })
    setResetUser(null)
  }

  const handleActivateUser = async (targetUser: EnterpriseUserRow) => {
    setTogglingUserId(targetUser.id)

    try {
      const result = await setUserActiveMutation.mutateAsync({
        userId: targetUser.id,
        isActive: true,
      })

      if (!result.success) {
        toast({
          variant: 'error',
          title: 'Activation failed',
          description: result.message,
        })
        return
      }

      toast({
        variant: 'success',
        title: 'User activated',
        description: `${targetUser.username} is now active.`,
      })
    } finally {
      setTogglingUserId(null)
    }
  }

  const handleDeactivateUser = async () => {
    if (!deactivateTarget) {
      return
    }

    setTogglingUserId(deactivateTarget.id)

    try {
      const result = await setUserActiveMutation.mutateAsync({
        userId: deactivateTarget.id,
        isActive: false,
      })

      if (!result.success) {
        toast({
          variant: 'error',
          title: 'Deactivation failed',
          description: result.message,
        })
        return
      }

      toast({
        variant: 'success',
        title: 'User deactivated',
        description: `${deactivateTarget.username} is now inactive.`,
      })
      setDeactivateTarget(null)
    } finally {
      setTogglingUserId(null)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) {
      return
    }

    if (!canDeleteUser(user?.id, deleteTarget)) {
      toast({
        variant: 'error',
        title: 'Delete not allowed',
        description: 'You cannot delete your own account.',
      })
      return
    }

    const result = await deleteUserMutation.mutateAsync(deleteTarget.id)

    if (!result.success) {
      toast({
        variant: 'error',
        title: 'Could not delete user',
        description: result.message,
      })
      return
    }

    toast({
      variant: 'success',
      title: 'User deleted',
      description: `${deleteTarget.username} was removed successfully.`,
    })
    setDeleteTarget(null)
    setSelectedUser(null)
  }

  const openResetPassword = (targetUser: EnterpriseUserRow | UserProfile) => {
    setResetUser(targetUser)
  }

  const openEditUser = (targetUser: EnterpriseUserRow | UserProfile) => {
    setEditingUser(targetUser)
  }

  const openDeleteUser = (targetUser: EnterpriseUserRow | UserProfile) => {
    setDeleteTarget(targetUser)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage application users, roles, access, and activity."
        icon={Users}
        actions={
          isAdmin ? (
            <PrimaryButton type="button" onClick={() => setIsAddOpen(true)}>
              <Plus className="size-4" />
              Add User
            </PrimaryButton>
          ) : null
        }
      />

      <UserStatsCards stats={stats} isLoading={isStatsLoading} />

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <UserManagementFilters filters={filters} onChange={setFilters} />

          {isLoading ? <UserTableSkeleton /> : null}

          {isError ? (
            <AlertBanner variant="error" title="Unable to load users">
              {error instanceof Error ? error.message : 'Please try again.'}
            </AlertBanner>
          ) : null}

          {!isLoading && !isError && data ? (
            <>
              <EnterpriseUserTable
                users={data.users}
                currentUserId={user?.id}
                onSelectUser={setSelectedUser}
                onEdit={openEditUser}
                onResetPassword={openResetPassword}
                onActivate={handleActivateUser}
                onDeactivate={setDeactivateTarget}
                onDelete={openDeleteUser}
                togglingUserId={togglingUserId}
              />

              {data.totalCount > 0 ? (
                <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {paginationLabel}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={filters.page <= 1}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          page: current.page - 1,
                        }))
                      }
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {data.page} of {data.totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={filters.page >= data.totalPages}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          page: current.page + 1,
                        }))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      <UserDetailsDrawer
        user={selectedUser}
        open={Boolean(selectedUser)}
        currentUserId={user?.id}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null)
          }
        }}
        onEdit={openEditUser}
        onResetPassword={openResetPassword}
        onActivate={handleActivateUser}
        onDeactivate={setDeactivateTarget}
        onDelete={openDeleteUser}
        togglingUserId={togglingUserId}
      />

      <AddUserDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={handleCreateUser}
        isSubmitting={createUserMutation.isPending}
      />

      <EditUserDialog
        user={editingUser}
        currentUserId={user?.id}
        open={Boolean(editingUser)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null)
          }
        }}
        onSubmit={handleUpdateUser}
        isSubmitting={updateUserMutation.isPending}
      />

      <ResetPasswordDialog
        user={resetUser}
        open={Boolean(resetUser)}
        onOpenChange={(open) => {
          if (!open) {
            setResetUser(null)
          }
        }}
        onSubmit={handleResetPassword}
        onSendResetEmail={handleSendResetEmail}
        isSubmitting={resetPasswordMutation.isPending}
        isSendingEmail={resetPasswordMutation.isPending}
      />

      <DeactivateUserDialog
        user={deactivateTarget}
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null)
          }
        }}
        onConfirm={handleDeactivateUser}
        isSubmitting={setUserActiveMutation.isPending}
      />

      <DeleteUserDialog
        user={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        onConfirm={handleDeleteUser}
        isSubmitting={deleteUserMutation.isPending}
      />
    </div>
  )
}
