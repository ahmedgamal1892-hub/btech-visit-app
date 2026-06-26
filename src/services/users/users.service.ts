import { FunctionsHttpError } from '@supabase/supabase-js'

import { AUTH_EMAIL_DOMAIN, resolveUsernameToEmail } from '@/lib/env'
import { getSupabaseClient } from '@/services/supabase/client'
import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
  UserListFilters,
  UserListResult,
  UserMutationResult,
  UserProfile,
} from '@/types/user'

const USER_PROFILE_COLUMNS =
  'id, full_name, username, role, phone, is_active, created_at, updated_at'

const ADMIN_USERS_FUNCTION = 'admin-users'

function mapMutationError(message: string): string {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('duplicate') ||
    normalized.includes('already registered') ||
    normalized.includes('already been registered')
  ) {
    return 'A user with this username or email already exists.'
  }

  if (normalized.includes('password')) {
    return message
  }

  if (normalized.includes('edge function')) {
    return 'The admin-users function is unavailable. Confirm it is deployed and try again.'
  }

  return message || 'Unable to complete the request. Please try again.'
}

async function resolveFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as {
        error?: string
        message?: string
      }

      if (body.error) {
        return mapMutationError(body.error)
      }

      if (body.message) {
        return mapMutationError(body.message)
      }
    } catch {
      // Fall through to generic message below.
    }
  }

  if (error instanceof Error) {
    return mapMutationError(error.message)
  }

  return 'Unable to complete the request. Please try again.'
}

async function invokeAdminUsers(
  body: Record<string, unknown>,
): Promise<UserMutationResult> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke(
    ADMIN_USERS_FUNCTION,
    {
      body,
    },
  )

  if (error) {
    return {
      success: false,
      message: await resolveFunctionError(error),
    }
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return {
      success: false,
      message: mapMutationError(String(data.error)),
    }
  }

  return { success: true }
}

export async function fetchUsers(
  filters: UserListFilters,
): Promise<UserListResult> {
  const supabase = getSupabaseClient()
  const from = (filters.page - 1) * filters.pageSize
  const to = from + filters.pageSize - 1

  let query = supabase
    .from('profiles')
    .select(USER_PROFILE_COLUMNS, { count: 'exact' })

  const search = filters.search.trim()
  if (search) {
    const sanitized = search.replace(/[%_]/g, '')
    if (sanitized) {
      query = query.or(
        `full_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%`,
      )
    }
  }

  if (filters.role !== 'all') {
    query = query.eq('role', filters.role)
  }

  if (filters.isActive === 'active') {
    query = query.eq('is_active', true)
  } else if (filters.isActive === 'inactive') {
    query = query.eq('is_active', false)
  }

  const { data, error, count } = await query
    .order('username', { ascending: true })
    .range(from, to)

  if (error) {
    throw new Error(error.message)
  }

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize))

  return {
    users: (data ?? []) as UserProfile[],
    totalCount,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
  }
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserInput,
): Promise<UserMutationResult> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName.trim(),
      phone: input.phone.trim() ? input.phone.trim() : null,
      role: input.role,
      is_active: input.isActive,
    })
    .eq('id', userId)

  if (error) {
    return {
      success: false,
      message: mapMutationError(error.message),
    }
  }

  return { success: true }
}

export async function createUser(
  input: CreateUserInput,
): Promise<UserMutationResult> {
  return invokeAdminUsers({
    action: 'create',
    username: input.username.trim().toLowerCase(),
    password: input.password,
    fullName: input.fullName.trim(),
    phone: input.phone.trim() ? input.phone.trim() : null,
    role: input.role,
    isActive: input.isActive,
  })
}

export async function resetUserPassword(
  input: ResetPasswordInput,
): Promise<UserMutationResult> {
  return invokeAdminUsers({
    action: 'reset_password',
    userId: input.userId,
    password: input.password,
  })
}

export async function deleteUser(userId: string): Promise<UserMutationResult> {
  return invokeAdminUsers({
    action: 'delete',
    userId,
  })
}

export function getUserAuthEmail(username: string): string {
  return resolveUsernameToEmail(username)
}

export const USER_AUTH_EMAIL_DOMAIN = AUTH_EMAIL_DOMAIN
