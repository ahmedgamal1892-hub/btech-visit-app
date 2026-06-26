export type SupabaseEnvConfig = {
  url: string
  anonKey: string
  authEmailDomain: string
}

export type SupabaseEnvValidation =
  | { isValid: true; config: SupabaseEnvConfig }
  | { isValid: false; message: string }

const PLACEHOLDER_PATTERNS = [
  /^your_/i,
  /placeholder/i,
  /replace_me/i,
  /example/i,
  /YOUR_PUBLISH/i,
]

function isPlaceholderValue(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value.trim()))
}

function isValidSupabaseKey(value: string): boolean {
  const trimmed = value.trim()

  if (trimmed.startsWith('sb_publishable_')) {
    return trimmed.length > 20
  }

  if (trimmed.startsWith('eyJ')) {
    return trimmed.split('.').length === 3
  }

  return false
}

export function validateSupabaseEnv(): SupabaseEnvValidation {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
  const authEmailDomain =
    import.meta.env.VITE_AUTH_EMAIL_DOMAIN?.trim() || 'btech.local'

  if (!url) {
    return {
      isValid: false,
      message:
        'Supabase is not configured. Add VITE_SUPABASE_URL to your .env file.',
    }
  }

  if (!anonKey) {
    return {
      isValid: false,
      message:
        'Supabase is not configured. Add VITE_SUPABASE_ANON_KEY (Publishable Key) to your .env file.',
    }
  }

  if (isPlaceholderValue(url) || isPlaceholderValue(anonKey)) {
    return {
      isValid: false,
      message:
        'Supabase credentials still contain placeholder values. Replace them with your project URL and Publishable Key from the Supabase dashboard.',
    }
  }

  try {
    const parsedUrl = new URL(url)

    if (!parsedUrl.hostname.includes('supabase.co')) {
      return {
        isValid: false,
        message:
          'VITE_SUPABASE_URL does not look like a valid Supabase project URL.',
      }
    }
  } catch {
    return {
      isValid: false,
      message: 'VITE_SUPABASE_URL is not a valid URL.',
    }
  }

  if (!isValidSupabaseKey(anonKey)) {
    return {
      isValid: false,
      message:
        'VITE_SUPABASE_ANON_KEY is invalid. Paste the full Publishable Key from Supabase (Settings → API) without extra text.',
    }
  }

  return {
    isValid: true,
    config: {
      url,
      anonKey,
      authEmailDomain,
    },
  }
}

export function getSupabaseEnvConfig(): SupabaseEnvConfig {
  const validation = validateSupabaseEnv()

  if (!validation.isValid) {
    throw new Error(validation.message)
  }

  return validation.config
}

export const AUTH_EMAIL_DOMAIN = 'btech.local'

export function resolveUsernameToEmail(username: string): string {
  const trimmed = username.trim().toLowerCase()

  if (trimmed.includes('@')) {
    return trimmed
  }

  return `${trimmed}@${AUTH_EMAIL_DOMAIN}`
}
