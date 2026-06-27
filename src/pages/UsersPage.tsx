import { Loader2, Plus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import {
  AddUserDialog,
  DeleteUserDialog,
  EditUserDialog,
  ResetPasswordDialog,
  UserFilters,
  UserTable,
} from '@/features/users/components'
import {
  createDefaultUserFilters,
  useCreateUser,
  useDeleteUser,
  useResetUserPassword,
  useSetUserActive,
  useUpdateUser,
  useUsers,
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
import type { UserListFilters, UserProfile } from '@/types/user'

export function UsersPage() {
  const { user, isLoading: isAuthLoading, isAdmin, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [filters, setFilters] = useState<Omit<UserListFilters, 'search'>>(
    () => {
      const defaults = createDefaultUserFilters()
      return {
        role: defaults.role,
        isActive: defaults.isActive,
        page: defaults.page,
        pageSize: defaults.pageSize,
      }
    },
  )
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [resetUser, setResetUser] = useState<UserProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)

  const queryFilters = useMemo<UserListFilters>(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch],
  )

  const { data, isLoading, isError, error } = useUsers(queryFilters)
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const resetPasswordMutation = useResetUserPassword()
  const setUserActiveMutation = useSetUserActive()
  const deleteUserMutation = useDeleteUser()
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

  const handleToggleActive = async (targetUser: UserProfile) => {
    setTogglingUserId(targetUser.id)

    try {
      const result = await setUserActiveMutation.mutateAsync({
        userId: targetUser.id,
        isActive: !targetUser.is_active,
      })

      if (!result.success) {
        toast({
          variant: 'error',
          title: targetUser.is_active
            ? 'Deactivation failed'
            : 'Activation failed',
          description: result.message,
        })
        return
      }

      toast({
        variant: 'success',
        title: targetUser.is_active ? 'User deactivated' : 'User activated',
        description: `${targetUser.username} is now ${
          targetUser.is_active ? 'inactive' : 'active'
        }.`,
      })
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
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="size-6 text-accent" aria-hidden="true" />
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Users
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage application users, roles, and access.
          </p>
        </div>

        <Button
          type="button"
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <UserFilters
            filters={{
              ...filters,
              search: searchInput,
            }}
            onChange={(nextFilters) => {
              setSearchInput(nextFilters.search)
              setFilters({
                role: nextFilters.role,
                isActive: nextFilters.isActive,
                page: 1,
                pageSize: filters.pageSize,
              })
            }}
          />

          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading users...
            </div>
          )}

          {isError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error instanceof Error ? error.message : 'Unable to load users.'}
            </div>
          )}

          {!isLoading && !isError && data && (
            <>
              <UserTable
                users={data.users}
                currentUserId={user?.id}
                onEdit={setEditingUser}
                onResetPassword={setResetUser}
                onToggleActive={(targetUser) =>
                  void handleToggleActive(targetUser)
                }
                onDelete={setDeleteTarget}
                togglingUserId={togglingUserId}
              />

              <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {paginationLabel}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
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
            </>
          )}
        </CardContent>
      </Card>

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
