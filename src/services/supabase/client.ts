import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { validateSupabaseEnv } from '@/lib/env'

let supabaseInstance: SupabaseClient | null = null

function getProjectUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''

  return url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      getProjectUrl(),
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    )
  }

  return supabaseInstance
}

export type SupabaseConnectionStatus =
  | { connected: true }
  | { connected: false; message: string }

export async function verifySupabaseConnection(): Promise<SupabaseConnectionStatus> {
  const validation = validateSupabaseEnv()

  if (!validation.isValid) {
    return {
      connected: false,
      message: validation.message,
    }
  }

  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.getSession()

    if (error) {
      return {
        connected: false,
        message:
          'Could not reach Supabase Auth. Check your project URL and Publishable Key, then restart the dev server.',
      }
    }

    return { connected: true }
  } catch {
    return {
      connected: false,
      message:
        'Supabase connection failed. Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, then restart the dev server.',
    }
  }
}
