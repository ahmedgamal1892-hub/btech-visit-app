import type { AuthError } from '@supabase/supabase-js'

import { resolveUsernameToEmail, validateSupabaseEnv } from '@/lib/env'
import { logClientAuditEvent, getClientAuditContext } from '@/services/audit'
import type { Profile, SignInResult } from '@/types/auth'
import { getSupabaseClient } from '@/services/supabase/client'

const GENERIC_LOGIN_ERROR =
  'Invalid username or password. Please check your credentials and try again.'

function logAuthError(error: AuthError): void {
  console.error('[Supabase Auth]', {
    message: error.message,
    code: error.code,
  })
}

function mapAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid email or password')
  ) {
    return GENERIC_LOGIN_ERROR
  }

  if (normalized.includes('email not confirmed')) {
    return 'Your account email has not been confirmed yet. Contact your administrator.'
  }

  return 'Unable to sign in right now. Please try again later.'
}

function resolveAuthErrorMessage(error: AuthError): string {
  logAuthError(error)

  if (import.meta.env.DEV) {
    return error.message
  }

  return mapAuthErrorMessage(error.message)
}

export async function signInWithUsername(
  username: string,
  password: string,
): Promise<SignInResult> {
  const envValidation = validateSupabaseEnv()

  if (!envValidation.isValid) {
    return {
      success: false,
      message: envValidation.message,
    }
  }

  const supabase = getSupabaseClient()
  const email = resolveUsernameToEmail(username)

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      success: false,
      message: resolveAuthErrorMessage(error),
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return {
      success: false,
      message: GENERIC_LOGIN_ERROR,
    }
  }

  const profile = await fetchCurrentProfile(session.user.id)

  if (!profile) {
    await supabase.auth.signOut()
    return {
      success: false,
      message: 'Your profile could not be loaded. Contact your administrator.',
    }
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    return {
      success: false,
      message:
        'Your account is deactivated. Contact your administrator for access.',
    }
  }

  await logClientAuditEvent({
    action: 'User Login',
    entityName: profile.username,
    details: {
      role: profile.role,
    },
    context: getClientAuditContext(),
  })

  return { success: true }
}

export async function signOut(actorUsername?: string | null): Promise<void> {
  const supabase = getSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.user) {
    await logClientAuditEvent({
      action: 'User Logout',
      entityName: actorUsername ?? session.user.email ?? null,
      context: getClientAuditContext(),
    })
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchCurrentProfile(
  userId: string,
): Promise<Profile | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, role, phone, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as Profile
}

export async function getCurrentSession() {
  const envValidation = validateSupabaseEnv()

  if (!envValidation.isValid) {
    return null
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error(error.message)
  }

  return data.session
}
