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

type SendResetEmailPayload = {
  action: 'send_reset_email'
  userId: string
}

type SetActivePayload = {
  action: 'set_active'
  userId: string
  isActive: boolean
}

type DeleteUserPayload = {
  action: 'delete'
  userId: string
}

type RequestPayload =
  | CreateUserPayload
  | ResetPasswordPayload
  | SendResetEmailPayload
  | SetActivePayload
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
    .select('role, is_active, username')
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

  return {
    ok: true as const,
    userId: user.id,
    username: profile?.username ?? user.email ?? 'admin',
  }
}

async function syncAuthBan(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  isActive: boolean,
) {
  const { error } = await serviceClient.auth.admin.updateUserById(userId, {
    ban_duration: isActive ? 'none' : '876000h',
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function logServiceAuditEvent(
  serviceClient: ReturnType<typeof createClient>,
  input: {
    actorUserId: string
    actorUsername: string
    action: string
    entityType: string
    entityId?: string | null
    entityName?: string | null
    details?: Record<string, unknown>
  },
) {
  const { error } = await serviceClient.rpc('log_service_audit_event', {
    p_actor_user_id: input.actorUserId,
    p_actor_username: input.actorUsername,
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? null,
    p_entity_name: input.entityName ?? null,
    p_details: input.details ?? {},
    p_ip_address: null,
    p_user_agent: null,
  })

  if (error) {
    console.error('[Audit Log]', error.message)
  }
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
  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

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

    if (!payload.isActive) {
      try {
        await syncAuthBan(serviceClient, createdUser.user.id, false)
      } catch (banError) {
        await serviceClient.auth.admin.deleteUser(createdUser.user.id)
        return jsonResponse(
          {
            error:
              banError instanceof Error
                ? banError.message
                : 'Failed to deactivate the new user in Auth.',
          },
          400,
        )
      }
    }

    await logServiceAuditEvent(serviceClient, {
      actorUserId: adminCheck.userId,
      actorUsername: adminCheck.username,
      action: 'User Created',
      entityType: 'user',
      entityId: createdUser.user.id,
      entityName: payload.username.trim().toLowerCase(),
      details: {
        full_name: payload.fullName.trim(),
        role: payload.role,
        is_active: payload.isActive,
      },
    })

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

    await logServiceAuditEvent(serviceClient, {
      actorUserId: adminCheck.userId,
      actorUsername: adminCheck.username,
      action: 'Password Reset',
      entityType: 'user',
      entityId: payload.userId,
      entityName: null,
      details: {
        method: 'admin_set_password',
      },
    })

    return jsonResponse({ userId: payload.userId })
  }

  if (payload.action === 'send_reset_email') {
    const { data: userData, error: userError } =
      await serviceClient.auth.admin.getUserById(payload.userId)

    if (userError || !userData.user?.email) {
      return jsonResponse(
        { error: userError?.message ?? 'User email was not found.' },
        400,
      )
    }

    const { error: resetEmailError } =
      await serviceClient.auth.resetPasswordForEmail(userData.user.email, {
        redirectTo: `${siteUrl.replace(/\/$/, '')}/login`,
      })

    if (resetEmailError) {
      return jsonResponse({ error: resetEmailError.message }, 400)
    }

    await logServiceAuditEvent(serviceClient, {
      actorUserId: adminCheck.userId,
      actorUsername: adminCheck.username,
      action: 'Password Reset',
      entityType: 'user',
      entityId: payload.userId,
      entityName: userData.user.email,
      details: {
        method: 'reset_email',
      },
    })

    return jsonResponse({ userId: payload.userId })
  }

  if (payload.action === 'set_active') {
    const { error: rpcError } = await callerClient.rpc(
      'admin_set_user_active',
      {
        p_user_id: payload.userId,
        p_is_active: payload.isActive,
      },
    )

    if (rpcError) {
      return jsonResponse({ error: rpcError.message }, 400)
    }

    try {
      await syncAuthBan(serviceClient, payload.userId, payload.isActive)
    } catch (banError) {
      await callerClient.rpc('admin_set_user_active', {
        p_user_id: payload.userId,
        p_is_active: !payload.isActive,
      })

      return jsonResponse(
        {
          error:
            banError instanceof Error
              ? banError.message
              : 'Failed to update Auth ban status.',
        },
        400,
      )
    }

    return jsonResponse({ userId: payload.userId, isActive: payload.isActive })
  }

  if (payload.action === 'delete') {
    if (payload.userId === adminCheck.userId) {
      return jsonResponse({ error: 'You cannot delete your own account.' }, 400)
    }

    const { error: prepareError } = await callerClient.rpc(
      'prepare_user_deletion',
      {
        p_user_id: payload.userId,
      },
    )

    if (prepareError) {
      return jsonResponse({ error: prepareError.message }, 400)
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
