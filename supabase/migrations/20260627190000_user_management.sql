-- =============================================================================
-- Admin user management — backend enforcement
-- Safe delete with historical data preservation via Deleted User placeholder.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.deleted_user_profile_id()
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT '00000000-0000-0000-0000-0000000000de'::UUID;
$$;

CREATE OR REPLACE FUNCTION public.count_active_admins()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.profiles
  WHERE role = 'Admin'
    AND is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.assert_last_active_admin_guard(
  p_user_id UUID,
  p_next_role TEXT DEFAULT NULL,
  p_next_is_active BOOLEAN DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.profiles;
  v_effective_role TEXT;
  v_effective_is_active BOOLEAN;
BEGIN
  SELECT *
  INTO v_current
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % was not found.', p_user_id;
  END IF;

  v_effective_role := COALESCE(p_next_role, v_current.role);
  v_effective_is_active := COALESCE(p_next_is_active, v_current.is_active);

  IF v_current.role = 'Admin'
     AND v_current.is_active = TRUE
     AND (v_effective_role <> 'Admin' OR v_effective_is_active = FALSE)
     AND public.count_active_admins() <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last active Admin account.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_admin_user_management(
  p_target_user_id UUID,
  p_allow_self BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden. Admin access required.';
  END IF;

  IF p_target_user_id = public.deleted_user_profile_id() THEN
    RAISE EXCEPTION 'The Deleted User placeholder account cannot be modified.';
  END IF;

  IF NOT p_allow_self AND p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot perform this action on your own account.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_target_user_id
  ) THEN
    RAISE EXCEPTION 'User % was not found.', p_target_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_user_deletion(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_placeholder UUID := public.deleted_user_profile_id();
  v_draft_visit_id UUID;
BEGIN
  PERFORM public.assert_admin_user_management(p_user_id, FALSE);

  IF p_user_id = v_placeholder THEN
    RAISE EXCEPTION 'The Deleted User placeholder account cannot be deleted.';
  END IF;

  PERFORM public.assert_last_active_admin_guard(p_user_id, 'Visitor', FALSE);

  FOR v_draft_visit_id IN
    SELECT id
    FROM public.visits
    WHERE user_id = p_user_id
      AND status = 'Draft'
  LOOP
    PERFORM public.delete_visit_cascade(v_draft_visit_id);
  END LOOP;

  UPDATE public.visits
  SET user_id = v_placeholder
  WHERE user_id = p_user_id;

  UPDATE public.visit_photos
  SET uploaded_by = v_placeholder
  WHERE uploaded_by = p_user_id;

  UPDATE public.import_batches
  SET uploaded_by = v_placeholder
  WHERE uploaded_by = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  p_user_id UUID,
  p_full_name TEXT,
  p_phone TEXT,
  p_role TEXT,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_admin_user_management(p_user_id, TRUE);

  IF p_role NOT IN ('Admin', 'Visitor') THEN
    RAISE EXCEPTION 'Invalid role %. Expected Admin or Visitor.', p_role;
  END IF;

  IF p_user_id = auth.uid() THEN
    IF p_is_active = FALSE THEN
      RAISE EXCEPTION 'You cannot deactivate your own account.';
    END IF;

    IF p_role <> 'Admin' THEN
      RAISE EXCEPTION 'You cannot remove your own Admin role.';
    END IF;
  END IF;

  PERFORM public.assert_last_active_admin_guard(
    p_user_id,
    p_role,
    p_is_active
  );

  UPDATE public.profiles
  SET
    full_name = trim(p_full_name),
    phone = NULLIF(trim(p_phone), ''),
    role = p_role,
    is_active = p_is_active
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_active(
  p_user_id UUID,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.profiles;
BEGIN
  PERFORM public.assert_admin_user_management(p_user_id, TRUE);

  IF p_user_id = auth.uid() AND p_is_active = FALSE THEN
    RAISE EXCEPTION 'You cannot deactivate your own account.';
  END IF;

  SELECT *
  INTO v_current
  FROM public.profiles
  WHERE id = p_user_id;

  PERFORM public.assert_last_active_admin_guard(
    p_user_id,
    v_current.role,
    p_is_active
  );

  UPDATE public.profiles
  SET is_active = p_is_active
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_profile_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.allow_profile_seed', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.id = public.deleted_user_profile_id() THEN
    RAISE EXCEPTION 'The Deleted User placeholder account cannot be modified.';
  END IF;

  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only admins can change user roles.';
    END IF;

    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Only admins can change account activation status.';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Profile id cannot be changed.';
    END IF;
  END IF;

  IF OLD.id = auth.uid() THEN
    IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
      RAISE EXCEPTION 'You cannot deactivate your own account.';
    END IF;

    IF OLD.role = 'Admin' AND NEW.role <> 'Admin' THEN
      RAISE EXCEPTION 'You cannot remove your own Admin role.';
    END IF;
  END IF;

  IF OLD.role = 'Admin'
     AND OLD.is_active = TRUE
     AND (NEW.role <> 'Admin' OR NEW.is_active = FALSE) THEN
    PERFORM public.assert_last_active_admin_guard(
      OLD.id,
      NEW.role,
      NEW.is_active
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prepare_user_deletion(UUID) IS
  'Reassigns historical records to the Deleted User placeholder and removes draft visits before auth deletion.';

COMMENT ON FUNCTION public.admin_update_user_profile(UUID, TEXT, TEXT, TEXT, BOOLEAN) IS
  'Admin-only profile update with self-service and last-admin safeguards.';

COMMENT ON FUNCTION public.admin_set_user_active(UUID, BOOLEAN) IS
  'Admin-only activation toggle with last-admin safeguards.';

GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(UUID, TEXT, TEXT, TEXT, BOOLEAN)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(UUID, BOOLEAN)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_user_deletion(UUID)
  TO authenticated;

DO $$
DECLARE
  v_user_id UUID := public.deleted_user_profile_id();
  v_instance_id UUID;
BEGIN
  PERFORM set_config('app.allow_profile_seed', 'true', true);

  SELECT id
  INTO v_instance_id
  FROM auth.instances
  LIMIT 1;

  IF v_instance_id IS NULL THEN
    SELECT instance_id
    INTO v_instance_id
    FROM auth.users
    LIMIT 1;
  END IF;

  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    v_user_id,
    v_instance_id,
    'authenticated',
    'authenticated',
    'deleted-user@internal.local',
    '',
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"username":"deleted-user"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (
    id,
    full_name,
    username,
    role,
    phone,
    is_active
  )
  VALUES (
    v_user_id,
    'Deleted User',
    'deleted-user',
    'Visitor',
    NULL,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active;
END;
$$;
