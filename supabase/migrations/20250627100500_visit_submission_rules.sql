-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 3
-- Migration: Visit workflow, submission rules, and PDF constraints
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Ownership helper for later RLS policies
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.owns_visit(p_visit_id UUID)
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
      AND user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.owns_visit(UUID) IS
  'Returns TRUE when the authenticated user owns the given visit.';

-- -----------------------------------------------------------------------------
-- Submit a Draft visit
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_visit(p_visit_id UUID)
RETURNS public.visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit public.visits;
BEGIN
  SELECT *
  INTO v_visit
  FROM public.visits
  WHERE id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', p_visit_id;
  END IF;

  IF v_visit.status IS DISTINCT FROM 'Draft' THEN
    RAISE EXCEPTION
      'Visit % is already submitted and cannot be submitted again.',
      p_visit_id;
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
  'Submits a Draft visit and records submitted_at/submitted_by.';

-- -----------------------------------------------------------------------------
-- Prevent mutation of submitted visits
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_submitted_visit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'Submitted' THEN
    RAISE EXCEPTION
      'Submitted visit % is immutable and cannot be updated.',
      OLD.id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Visits are never deleted.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_submitted_visit_mutation
  BEFORE UPDATE OR DELETE ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_submitted_visit_mutation();

-- -----------------------------------------------------------------------------
-- Prevent mutation of observations and photos once visit is submitted
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_submitted_visit_child_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_visit_id UUID;
  v_visit_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION '% rows are never deleted.', TG_TABLE_NAME;
  END IF;

  v_visit_id := NEW.visit_id;

  SELECT status
  INTO v_visit_status
  FROM public.visits
  WHERE id = v_visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', v_visit_id;
  END IF;

  IF v_visit_status = 'Submitted' THEN
    RAISE EXCEPTION
      'Visit % is submitted. % rows are immutable.',
      v_visit_id,
      TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_submitted_visit_observation_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.visit_observations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_submitted_visit_child_mutation();

CREATE TRIGGER prevent_submitted_visit_photo_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.visit_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_submitted_visit_child_mutation();

-- -----------------------------------------------------------------------------
-- PDF reports may only be created after successful visit submission
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_pdf_report_submitted_visit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_visit_status TEXT;
BEGIN
  SELECT status
  INTO v_visit_status
  FROM public.visits
  WHERE id = NEW.visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', NEW.visit_id;
  END IF;

  IF v_visit_status IS DISTINCT FROM 'Submitted' THEN
    RAISE EXCEPTION
      'PDF reports can only be generated after visit % is submitted.',
      NEW.visit_id;
  END IF;

  IF NEW.generated_by IS NULL THEN
    NEW.generated_by := auth.uid();
  END IF;

  IF TG_OP = 'INSERT' AND NEW.is_current = TRUE THEN
    UPDATE public.pdf_reports
    SET
      is_current = FALSE,
      updated_at = NOW()
    WHERE visit_id = NEW.visit_id
      AND is_current = TRUE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_pdf_report_submitted_visit
  BEFORE INSERT ON public.pdf_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pdf_report_submitted_visit();

CREATE OR REPLACE FUNCTION public.prevent_submitted_pdf_report_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PDF reports are never deleted.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_submitted_pdf_report_delete
  BEFORE DELETE ON public.pdf_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_submitted_pdf_report_mutation();

COMMENT ON FUNCTION public.enforce_pdf_report_submitted_visit() IS
  'Ensures PDF generation happens only after a visit has been submitted.';
