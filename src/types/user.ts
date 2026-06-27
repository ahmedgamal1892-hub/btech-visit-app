import type { UserRole } from '@/types/auth'

export type UserProfile = {
  id: string
  full_name: string
  username: string
  role: UserRole
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type UserListFilters = {
  search: string
  role: UserRole | 'all'
  isActive: 'all' | 'active' | 'inactive'
  page: number
  pageSize: number
}

export type UserListResult = {
  users: UserProfile[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateUserInput = {
  fullName: string
  username: string
  password: string
  phone: string
  role: UserRole
  isActive: boolean
}

export type UpdateUserInput = {
  fullName: string
  phone: string
  role: UserRole
  isActive: boolean
}

export type ResetPasswordInput =
  | {
      userId: string
      mode: 'set'
      password: string
    }
  | {
      userId: string
      mode: 'email'
    }

export type SetUserActiveInput = {
  userId: string
  isActive: boolean
}

export type UserMutationResult =
  | { success: true }
  | { success: false; message: string }
