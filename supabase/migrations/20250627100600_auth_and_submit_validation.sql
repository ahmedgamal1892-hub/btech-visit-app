-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 4
-- Migration: Auth integration and submit validation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Auto-create profile when a Supabase Auth user is created
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    username,
    role,
    phone,
    is_active
  )
  VALUES (
    NEW.id,
    '',
    lower(split_part(COALESCE(NEW.email, ''), '@', 1)),
    'Visitor',
    NULL,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates a default public.profiles row when a Supabase Auth user is created.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT INSERT, SELECT, UPDATE
  ON public.profiles
  TO supabase_auth_admin;

-- -----------------------------------------------------------------------------
-- Prevent non-admins from changing privileged profile fields
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_profile_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_update_rules ON public.profiles;

CREATE TRIGGER enforce_profile_update_rules
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_update_rules();

-- -----------------------------------------------------------------------------
-- Draft visit helper
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_draft_visit(p_visit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visits
    WHERE id = p_visit_id
      AND status = 'Draft'
  );
$$;

COMMENT ON FUNCTION public.is_draft_visit(UUID) IS
  'Returns TRUE when the visit exists and is still in Draft status.';

-- -----------------------------------------------------------------------------
-- Submit with validation
-- Rules:
--   1. Store selected
--   2. At least one observation
--   3. Every observation has a status
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_visit(p_visit_id UUID)
RETURNS public.visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit public.visits;
  v_observation_count INTEGER;
BEGIN
  SELECT *
  INTO v_visit
  FROM public.visits
  WHERE id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', p_visit_id;
  END IF;

  IF NOT public.is_admin() AND v_visit.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You are not authorized to submit this visit.';
  END IF;

  IF v_visit.status IS DISTINCT FROM 'Draft' THEN
    RAISE EXCEPTION
      'Visit % is already submitted and is read-only.',
      p_visit_id;
  END IF;

  IF v_visit.store_name IS NULL OR char_length(trim(v_visit.store_name)) = 0 THEN
    RAISE EXCEPTION 'A store must be selected before submitting the visit.';
  END IF;

  SELECT COUNT(*)
  INTO v_observation_count
  FROM public.visit_observations
  WHERE visit_id = p_visit_id;

  IF v_observation_count = 0 THEN
    RAISE EXCEPTION
      'At least one observation is required before submitting the visit.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.visit_observations AS vo
    WHERE vo.visit_id = p_visit_id
      AND vo.visit_status_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Every observation must have a status before submitting the visit.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.visit_observations AS vo
    LEFT JOIN public.visit_statuses AS vs ON vs.id = vo.visit_status_id
    WHERE vo.visit_id = p_visit_id
      AND (vs.id IS NULL OR vs.is_active = FALSE)
  ) THEN
    RAISE EXCEPTION
      'Every observation must have a valid active status before submitting the visit.';
  END IF;

  UPDATE public.visits
  SET
    status       = 'Submitted',
    submitted_at = NOW(),
    submitted_by = auth.uid(),
    updated_at   = NOW()
  WHERE id = p_visit_id
  RETURNING *
  INTO v_visit;

  RETURN v_visit;
END;
$$;

COMMENT ON FUNCTION public.submit_visit(UUID) IS
  'Validates and submits a Draft visit. Submitted visits become read-only.';

-- -----------------------------------------------------------------------------
-- Block PDF report updates after creation (Version 1 read-only)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_pdf_report_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_current = TRUE
       AND NEW.is_current = FALSE
       AND NEW.visit_id = OLD.visit_id
       AND NEW.storage_path = OLD.storage_path
       AND NEW.file_name = OLD.file_name
       AND NEW.generated_by IS NOT DISTINCT FROM OLD.generated_by
       AND NEW.file_size_bytes IS NOT DISTINCT FROM OLD.file_size_bytes
       AND NEW.version = OLD.version THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'PDF reports are read-only after creation.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PDF reports are never deleted.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_submitted_pdf_report_delete ON public.pdf_reports;

CREATE TRIGGER prevent_pdf_report_immutable
  BEFORE UPDATE OR DELETE ON public.pdf_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_pdf_report_update();

-- Allow is_current demotion during new PDF insert via a dedicated helper.

CREATE OR REPLACE FUNCTION public.create_visit_pdf_report(
  p_visit_id       UUID,
  p_storage_path   TEXT,
  p_file_name      TEXT,
  p_file_size_bytes BIGINT DEFAULT NULL,
  p_version        INTEGER DEFAULT 1
)
RETURNS public.pdf_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.pdf_reports;
  v_visit_status TEXT;
BEGIN
  SELECT status
  INTO v_visit_status
  FROM public.visits
  WHERE id = p_visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', p_visit_id;
  END IF;

  IF v_visit_status IS DISTINCT FROM 'Submitted' THEN
    RAISE EXCEPTION
      'PDF reports can only be generated after visit % is submitted.',
      p_visit_id;
  END IF;

  IF NOT public.is_admin() AND NOT public.owns_visit(p_visit_id) THEN
    RAISE EXCEPTION 'You are not authorized to create a PDF for this visit.';
  END IF;

  UPDATE public.pdf_reports
  SET
    is_current = FALSE,
    updated_at = NOW()
  WHERE visit_id = p_visit_id
    AND is_current = TRUE;

  INSERT INTO public.pdf_reports (
    visit_id,
    generated_by,
    storage_path,
    file_name,
    file_size_bytes,
    version,
    is_current
  )
  VALUES (
    p_visit_id,
    auth.uid(),
    p_storage_path,
    p_file_name,
    p_file_size_bytes,
    GREATEST(p_version, 1),
    TRUE
  )
  RETURNING *
  INTO v_report;

  RETURN v_report;
END;
$$;

COMMENT ON FUNCTION public.create_visit_pdf_report(
  UUID, TEXT, TEXT, BIGINT, INTEGER
) IS
  'Creates a PDF report for a submitted visit and marks it as the current version.';

-- Remove direct-insert trigger in favour of the helper above.
DROP TRIGGER IF EXISTS enforce_pdf_report_submitted_visit ON public.pdf_reports;

DROP FUNCTION IF EXISTS public.prevent_submitted_pdf_report_mutation();
