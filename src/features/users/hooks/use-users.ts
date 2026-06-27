import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createUser,
  deleteUser,
  fetchUsers,
  resetUserPassword,
  setUserActive,
  updateUserProfile,
} from '@/services/users'
import type {
  CreateUserInput,
  ResetPasswordInput,
  SetUserActiveInput,
  UpdateUserInput,
  UserListFilters,
} from '@/types/user'

import { DEFAULT_USERS_PAGE_SIZE, USERS_QUERY_KEY } from '../constants'
import { userDirectoryQueryKeys } from './use-user-directory'

export function useUsers(filters: UserListFilters) {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, filters],
    queryFn: () => fetchUsers(filters),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] })
      await Promise.all(
        userDirectoryQueryKeys().map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [queryKey] }),
        ),
      )
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string
      input: UpdateUserInput
    }) => updateUserProfile(userId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] })
      await Promise.all(
        userDirectoryQueryKeys().map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [queryKey] }),
        ),
      )
    },
  })
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetUserPassword(input),
  })
}

export function useSetUserActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SetUserActiveInput) => setUserActive(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] })
      await Promise.all(
        userDirectoryQueryKeys().map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [queryKey] }),
        ),
      )
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] })
      await Promise.all(
        userDirectoryQueryKeys().map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [queryKey] }),
        ),
      )
    },
  })
}

export function createDefaultUserFilters(): UserListFilters {
  return {
    search: '',
    role: 'all',
    isActive: 'all',
    page: 1,
    pageSize: DEFAULT_USERS_PAGE_SIZE,
  }
}
