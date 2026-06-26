import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

type CreateUserPayload = {
  action: 'create'
  username: string
  password: string
  fullName: string
  phone: string | null
  role: 'Admin' | 'Visitor'
  isActive: boolean
}

type ResetPasswordPayload = {
  action: 'reset_password'
  userId: string
  password: string
}

type DeleteUserPayload = {
  action: 'delete'
  userId: string
}

type RequestPayload =
  | CreateUserPayload
  | ResetPasswordPayload
  | DeleteUserPayload

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function resolveEmail(username: string, domain: string) {
  const normalized = username.trim().toLowerCase()
  if (normalized.includes('@')) {
    return normalized
  }

  return `${normalized}@${domain}`
}

async function assertAdmin(callerClient: ReturnType<typeof createClient>) {
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser()

  if (userError || !user) {
    return {
      ok: false as const,
      response: jsonResponse({ error: 'Unauthorized.' }, 401),
    }
  }

  const { data: profile, error: profileError } = await callerClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (
    profileError ||
    !profile ||
    profile.role !== 'Admin' ||
    profile.is_active !== true
  ) {
    return {
      ok: false as const,
      response: jsonResponse(
        { error: 'Forbidden. Admin access required.' },
        403,
      ),
    }
  }

  return { ok: true as const, userId: user.id }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authEmailDomain = Deno.env.get('AUTH_EMAIL_DOMAIN') ?? 'btech.local'

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Function is not configured.' }, 500)
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization) {
    return jsonResponse({ error: 'Missing Authorization header.' }, 401)
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  })

  const adminCheck = await assertAdmin(callerClient)
  if (!adminCheck.ok) {
    return adminCheck.response
  }

  let payload: RequestPayload
  try {
    payload = (await request.json()) as RequestPayload
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400)
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  if (payload.action === 'create') {
    const email = resolveEmail(payload.username, authEmailDomain)

    const { data: createdUser, error: createError } =
      await serviceClient.auth.admin.createUser({
        email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          username: payload.username.trim().toLowerCase(),
        },
      })

    if (createError || !createdUser.user) {
      return jsonResponse(
        { error: createError?.message ?? 'Failed to create auth user.' },
        400,
      )
    }

    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({
        full_name: payload.fullName.trim(),
        username: payload.username.trim().toLowerCase(),
        phone: payload.phone?.trim() ? payload.phone.trim() : null,
        role: payload.role,
        is_active: payload.isActive,
      })
      .eq('id', createdUser.user.id)

    if (profileError) {
      await serviceClient.auth.admin.deleteUser(createdUser.user.id)
      return jsonResponse({ error: profileError.message }, 400)
    }

    return jsonResponse({ userId: createdUser.user.id })
  }

  if (payload.action === 'reset_password') {
    const { error: resetError } = await serviceClient.auth.admin.updateUserById(
      payload.userId,
      { password: payload.password },
    )

    if (resetError) {
      return jsonResponse({ error: resetError.message }, 400)
    }

    return jsonResponse({ userId: payload.userId })
  }

  if (payload.action === 'delete') {
    if (payload.userId === adminCheck.userId) {
      return jsonResponse({ error: 'You cannot delete your own account.' }, 400)
    }

    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(
      payload.userId,
    )

    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 400)
    }

    return jsonResponse({ userId: payload.userId })
  }

  return jsonResponse({ error: 'Unsupported action.' }, 400)
})
