-- =============================================================================
-- Audit log system — append-only activity trail for admin review
-- =============================================================================

CREATE TABLE public.audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id   UUID        REFERENCES public.profiles (id) ON DELETE SET NULL,
  actor_username  TEXT        NOT NULL,
  action          TEXT        NOT NULL,
  entity_type     TEXT        NOT NULL,
  entity_id       TEXT,
  entity_name     TEXT,
  details         JSONB       NOT NULL DEFAULT '{}'::JSONB,
  ip_address      TEXT,
  user_agent      TEXT,

  CONSTRAINT audit_logs_action_not_empty_check
    CHECK (char_length(trim(action)) > 0),

  CONSTRAINT audit_logs_entity_type_not_empty_check
    CHECK (char_length(trim(entity_type)) > 0),

  CONSTRAINT audit_logs_actor_username_not_empty_check
    CHECK (char_length(trim(actor_username)) > 0)
);

CREATE INDEX idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);

CREATE INDEX idx_audit_logs_actor_user_id
  ON public.audit_logs (actor_user_id);

CREATE INDEX idx_audit_logs_action
  ON public.audit_logs (action);

CREATE INDEX idx_audit_logs_entity_type
  ON public.audit_logs (entity_type);

CREATE INDEX idx_audit_logs_entity_id
  ON public.audit_logs (entity_id);

COMMENT ON TABLE public.audit_logs IS
  'Append-only audit trail of significant application actions. Admin read-only.';

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY admin_select_audit_logs
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action          TEXT,
  p_entity_type     TEXT,
  p_entity_id       TEXT DEFAULT NULL,
  p_entity_name     TEXT DEFAULT NULL,
  p_details         JSONB DEFAULT '{}'::JSONB,
  p_ip_address      TEXT DEFAULT NULL,
  p_user_agent      TEXT DEFAULT NULL,
  p_actor_user_id   UUID DEFAULT auth.uid(),
  p_actor_username  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_username TEXT;
  v_log_id UUID;
BEGIN
  IF p_action IS NULL OR char_length(trim(p_action)) = 0 THEN
    RAISE EXCEPTION 'Audit action is required.';
  END IF;

  IF p_entity_type IS NULL OR char_length(trim(p_entity_type)) = 0 THEN
    RAISE EXCEPTION 'Audit entity type is required.';
  END IF;

  v_actor_username := NULLIF(trim(p_actor_username), '');

  IF v_actor_username IS NULL AND p_actor_user_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(trim(username), ''), 'unknown')
    INTO v_actor_username
    FROM public.profiles
    WHERE id = p_actor_user_id;
  END IF;

  IF v_actor_username IS NULL THEN
    v_actor_username := 'system';
  END IF;

  INSERT INTO public.audit_logs (
    actor_user_id,
    actor_username,
    action,
    entity_type,
    entity_id,
    entity_name,
    details,
    ip_address,
    user_agent
  )
  VALUES (
    p_actor_user_id,
    v_actor_username,
    trim(p_action),
    trim(p_entity_type),
    NULLIF(trim(p_entity_id), ''),
    NULLIF(trim(p_entity_name), ''),
    COALESCE(p_details, '{}'::JSONB),
    NULLIF(trim(p_ip_address), ''),
    NULLIF(trim(p_user_agent), '')
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_client_audit_event(
  p_action      TEXT,
  p_entity_type TEXT DEFAULT 'auth',
  p_entity_id   TEXT DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_details     JSONB DEFAULT '{}'::JSONB,
  p_ip_address  TEXT DEFAULT NULL,
  p_user_agent  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF p_action NOT IN ('User Login', 'User Logout') THEN
    RAISE EXCEPTION 'Unsupported client audit action: %.', p_action;
  END IF;

  RETURN public.write_audit_log(
    p_action,
    p_entity_type,
    COALESCE(p_entity_id, auth.uid()::TEXT),
    p_entity_name,
    p_details,
    p_ip_address,
    p_user_agent,
    auth.uid(),
    NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_service_audit_event(
  p_actor_user_id   UUID,
  p_actor_username  TEXT,
  p_action          TEXT,
  p_entity_type     TEXT,
  p_entity_id       TEXT DEFAULT NULL,
  p_entity_name     TEXT DEFAULT NULL,
  p_details         JSONB DEFAULT '{}'::JSONB,
  p_ip_address      TEXT DEFAULT NULL,
  p_user_agent      TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Actor user id is required.';
  END IF;

  RETURN public.write_audit_log(
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_details,
    p_ip_address,
    p_user_agent,
    p_actor_user_id,
    p_actor_username
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_visit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'Visit Created',
      'visit',
      NEW.id::TEXT,
      NEW.store_name,
      jsonb_build_object(
        'status', NEW.status,
        'store_id', NEW.store_id,
        'visit_number', NEW.visit_number
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW IS NOT DISTINCT FROM OLD THEN
      RETURN NEW;
    END IF;

    PERFORM public.write_audit_log(
      'Visit Updated',
      'visit',
      NEW.id::TEXT,
      COALESCE(NEW.visit_number, NEW.store_name),
      jsonb_build_object(
        'previous_status', OLD.status,
        'status', NEW.status,
        'store_name', NEW.store_name,
        'visit_number', NEW.visit_number
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit_log(
      'Visit Deleted',
      'visit',
      OLD.id::TEXT,
      COALESCE(OLD.visit_number, OLD.store_name),
      jsonb_build_object(
        'status', OLD.status,
        'store_name', OLD.store_name,
        'visit_number', OLD.visit_number
      )
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_details JSONB := '{}'::JSONB;
  v_profile_changed BOOLEAN := FALSE;
BEGIN
  IF current_setting('app.allow_profile_seed', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.username = 'deleted-user' THEN
      RETURN OLD;
    END IF;

    PERFORM public.write_audit_log(
      'User Deleted',
      'user',
      OLD.id::TEXT,
      OLD.username,
      jsonb_build_object(
        'full_name', OLD.full_name,
        'role', OLD.role
      )
    );
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.username = 'deleted-user' THEN
      RETURN NEW;
    END IF;

    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      PERFORM public.write_audit_log(
        CASE WHEN NEW.is_active THEN 'User Activated' ELSE 'User Deactivated' END,
        'user',
        NEW.id::TEXT,
        NEW.username,
        jsonb_build_object(
          'full_name', NEW.full_name,
          'role', NEW.role,
          'is_active', NEW.is_active
        )
      );
    END IF;

    v_profile_changed := (
      NEW.full_name IS DISTINCT FROM OLD.full_name
      OR NEW.phone IS DISTINCT FROM OLD.phone
      OR NEW.role IS DISTINCT FROM OLD.role
    );

    IF v_profile_changed THEN
      v_details := jsonb_build_object(
        'full_name', NEW.full_name,
        'role', NEW.role,
        'phone', NEW.phone
      );

      PERFORM public.write_audit_log(
        'User Updated',
        'user',
        NEW.id::TEXT,
        NEW.username,
        v_details
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_import_batch_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.allow_profile_seed', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    PERFORM public.write_audit_log(
      'Excel Upload',
      'import',
      NEW.id::TEXT,
      NEW.file_name,
      jsonb_build_object(
        'status', NEW.status,
        'display_row_count', NEW.display_row_count,
        'ach_row_count', NEW.ach_row_count,
        'display_hash', NEW.display_hash,
        'ach_hash', NEW.ach_hash
      ),
      NULL,
      NULL,
      NEW.uploaded_by,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_app_settings_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.allow_profile_seed', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM public.write_audit_log(
      'Settings Updated',
      'settings',
      NEW.key,
      NEW.key,
      jsonb_build_object(
        'previous_value', OLD.value,
        'value', NEW.value
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_visits_changes ON public.visits;
CREATE TRIGGER audit_visits_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_visit_changes();

DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
  AFTER UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_changes();

DROP TRIGGER IF EXISTS audit_import_batches_insert ON public.import_batches;
CREATE TRIGGER audit_import_batches_insert
  AFTER INSERT ON public.import_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_import_batch_changes();

DROP TRIGGER IF EXISTS audit_app_settings_update ON public.app_settings;
CREATE TRIGGER audit_app_settings_update
  AFTER UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_app_settings_changes();

CREATE OR REPLACE FUNCTION public.list_audit_log_filter_options()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actions JSONB := '[]'::JSONB;
  v_entity_types JSONB := '[]'::JSONB;
  v_actors JSONB := '[]'::JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden. Admin access required.';
  END IF;

  SELECT COALESCE(jsonb_agg(DISTINCT action ORDER BY action), '[]'::JSONB)
  INTO v_actions
  FROM public.audit_logs;

  SELECT COALESCE(jsonb_agg(DISTINCT entity_type ORDER BY entity_type), '[]'::JSONB)
  INTO v_entity_types
  FROM public.audit_logs;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', actor.id,
        'username', actor.username,
        'full_name', actor.full_name
      )
      ORDER BY actor.username
    ),
    '[]'::JSONB
  )
  INTO v_actors
  FROM (
    SELECT DISTINCT
      al.actor_user_id AS id,
      al.actor_username AS username,
      COALESCE(NULLIF(trim(p.full_name), ''), al.actor_username) AS full_name
    FROM public.audit_logs AS al
    LEFT JOIN public.profiles AS p ON p.id = al.actor_user_id
    WHERE al.actor_user_id IS NOT NULL
  ) AS actor;

  RETURN jsonb_build_object(
    'actions', v_actions,
    'entity_types', v_entity_types,
    'actors', v_actors
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_audit_logs(
  p_search        TEXT DEFAULT '',
  p_actor_user_id UUID DEFAULT NULL,
  p_action        TEXT DEFAULT NULL,
  p_entity_type   TEXT DEFAULT NULL,
  p_from_date     TIMESTAMPTZ DEFAULT NULL,
  p_to_date       TIMESTAMPTZ DEFAULT NULL,
  p_page          INTEGER DEFAULT 1,
  p_page_size     INTEGER DEFAULT 25
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_offset INTEGER;
  v_total_count INTEGER;
  v_total_pages INTEGER;
  v_rows JSONB := '[]'::JSONB;
  v_search TEXT := trim(COALESCE(p_search, ''));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden. Admin access required.';
  END IF;

  v_offset := (v_page - 1) * v_page_size;

  SELECT COUNT(*)
  INTO v_total_count
  FROM public.audit_logs AS al
  WHERE (p_actor_user_id IS NULL OR al.actor_user_id = p_actor_user_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_from_date IS NULL OR al.created_at >= p_from_date)
    AND (p_to_date IS NULL OR al.created_at <= p_to_date)
    AND (
      v_search = ''
      OR al.actor_username ILIKE '%' || v_search || '%'
      OR al.action ILIKE '%' || v_search || '%'
      OR al.entity_type ILIKE '%' || v_search || '%'
      OR COALESCE(al.entity_name, '') ILIKE '%' || v_search || '%'
      OR COALESCE(al.entity_id, '') ILIKE '%' || v_search || '%'
    );

  v_total_pages := GREATEST(1, CEIL(v_total_count::NUMERIC / v_page_size)::INTEGER);

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', row.id,
        'created_at', row.created_at,
        'actor_user_id', row.actor_user_id,
        'actor_username', row.actor_username,
        'action', row.action,
        'entity_type', row.entity_type,
        'entity_id', row.entity_id,
        'entity_name', row.entity_name,
        'details', row.details,
        'ip_address', row.ip_address,
        'user_agent', row.user_agent
      )
    ),
    '[]'::JSONB
  )
  INTO v_rows
  FROM (
    SELECT
      al.id,
      al.created_at,
      al.actor_user_id,
      al.actor_username,
      al.action,
      al.entity_type,
      al.entity_id,
      al.entity_name,
      al.details,
      al.ip_address,
      al.user_agent
    FROM public.audit_logs AS al
    WHERE (p_actor_user_id IS NULL OR al.actor_user_id = p_actor_user_id)
      AND (p_action IS NULL OR al.action = p_action)
      AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
      AND (p_from_date IS NULL OR al.created_at >= p_from_date)
      AND (p_to_date IS NULL OR al.created_at <= p_to_date)
      AND (
        v_search = ''
        OR al.actor_username ILIKE '%' || v_search || '%'
        OR al.action ILIKE '%' || v_search || '%'
        OR al.entity_type ILIKE '%' || v_search || '%'
        OR COALESCE(al.entity_name, '') ILIKE '%' || v_search || '%'
        OR COALESCE(al.entity_id, '') ILIKE '%' || v_search || '%'
      )
    ORDER BY al.created_at DESC
    LIMIT v_page_size
    OFFSET v_offset
  ) AS row;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total_count', v_total_count,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', v_total_pages
  );
END;
$$;

COMMENT ON FUNCTION public.write_audit_log(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT) IS
  'Internal helper to append audit log rows.';

COMMENT ON FUNCTION public.log_client_audit_event(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) IS
  'Client-callable audit logging for login and logout events.';

COMMENT ON FUNCTION public.log_service_audit_event(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) IS
  'Service-callable audit logging for privileged edge function actions.';

GRANT EXECUTE ON FUNCTION public.log_client_audit_event(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_service_audit_event(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.list_audit_logs(TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_audit_log_filter_options()
  TO authenticated;

REVOKE ALL ON FUNCTION public.write_audit_log(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.write_audit_log(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT) FROM authenticated;
