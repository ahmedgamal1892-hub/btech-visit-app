-- Atomic visit submission: visit + inspection items + photo metadata + Submitted status.

-- Allow draft cleanup during failed submission rollback.
CREATE OR REPLACE FUNCTION public.prevent_submitted_visit_child_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_visit_id UUID;
  v_visit_status TEXT;
BEGIN
  IF current_setting('app.allow_draft_cleanup', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

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

-- Reserve a Draft visit shell so photo uploads can target {visit_id}/ paths.
CREATE OR REPLACE FUNCTION public.register_draft_visit(
  p_visit_id        UUID,
  p_store_id        UUID,
  p_store_name      TEXT,
  p_started_at      TIMESTAMPTZ DEFAULT NULL,
  p_import_batch_id UUID DEFAULT NULL
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

  IF p_visit_id IS NULL THEN
    RAISE EXCEPTION 'A visit id is required.';
  END IF;

  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'A branch must be selected before submitting the visit.';
  END IF;

  IF p_store_name IS NULL OR char_length(trim(p_store_name)) = 0 THEN
    RAISE EXCEPTION 'A branch must be selected before submitting the visit.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stores
    WHERE id = p_store_id
  ) THEN
    RAISE EXCEPTION 'Selected branch was not found.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.visits
    WHERE id = p_visit_id
  ) THEN
    RAISE EXCEPTION 'Visit % already exists.', p_visit_id;
  END IF;

  INSERT INTO public.visits (
    id,
    user_id,
    import_batch_id,
    store_id,
    store_name,
    status,
    started_at
  )
  VALUES (
    p_visit_id,
    auth.uid(),
    p_import_batch_id,
    p_store_id,
    trim(p_store_name),
    'Draft',
    COALESCE(p_started_at, NOW())
  );

  RETURN p_visit_id;
END;
$$;

COMMENT ON FUNCTION public.register_draft_visit(UUID, UUID, TEXT, TIMESTAMPTZ, UUID) IS
  'Creates a Draft visit shell for photo upload before atomic submission.';

-- Roll back a failed submission attempt (Draft visits only).
CREATE OR REPLACE FUNCTION public.abort_draft_visit(p_visit_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF p_visit_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.visits
    WHERE id = p_visit_id
      AND status = 'Draft'
      AND (
        user_id = auth.uid()
        OR public.is_admin()
      )
  ) THEN
    RETURN;
  END IF;

  PERFORM set_config('app.allow_draft_cleanup', 'true', true);

  DELETE FROM public.visit_photos
  WHERE visit_id = p_visit_id;

  DELETE FROM public.visit_observations
  WHERE visit_id = p_visit_id;

  DELETE FROM public.visits
  WHERE id = p_visit_id
    AND status = 'Draft';
END;
$$;

COMMENT ON FUNCTION public.abort_draft_visit(UUID) IS
  'Removes a Draft visit and its child rows after a failed submission attempt.';

-- Submit visit, inspection items, and photo metadata in one database transaction.
CREATE OR REPLACE FUNCTION public.submit_visit_complete(
  p_visit_id        UUID,
  p_store_id        UUID,
  p_store_name      TEXT,
  p_general_notes   TEXT,
  p_started_at      TIMESTAMPTZ,
  p_import_batch_id UUID,
  p_observations    JSONB,
  p_photos          JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit_id        UUID;
  v_observation     JSONB;
  v_photo           JSONB;
  v_display_order   INTEGER;
  v_observation_count INTEGER;
  v_submitted_at    TIMESTAMPTZ := NOW();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'A branch must be selected before submitting the visit.';
  END IF;

  IF p_store_name IS NULL OR char_length(trim(p_store_name)) = 0 THEN
    RAISE EXCEPTION 'A branch must be selected before submitting the visit.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stores
    WHERE id = p_store_id
  ) THEN
    RAISE EXCEPTION 'Selected branch was not found.';
  END IF;

  IF jsonb_typeof(p_observations) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Observations payload must be a JSON array.';
  END IF;

  IF jsonb_array_length(p_observations) = 0 THEN
    RAISE EXCEPTION
      'At least one inspection item is required before submitting the visit.';
  END IF;

  IF jsonb_typeof(p_photos) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Photos payload must be a JSON array.';
  END IF;

  IF p_visit_id IS NULL THEN
    v_visit_id := gen_random_uuid();

    INSERT INTO public.visits (
      id,
      user_id,
      import_batch_id,
      store_id,
      store_name,
      status,
      general_notes,
      started_at
    )
    VALUES (
      v_visit_id,
      auth.uid(),
      p_import_batch_id,
      p_store_id,
      trim(p_store_name),
      'Draft',
      NULLIF(trim(p_general_notes), ''),
      COALESCE(p_started_at, NOW())
    );
  ELSE
    v_visit_id := p_visit_id;

    IF NOT EXISTS (
      SELECT 1
      FROM public.visits
      WHERE id = v_visit_id
        AND status = 'Draft'
        AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Draft visit % was not found.', v_visit_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.visit_observations
      WHERE visit_id = v_visit_id
    ) THEN
      RAISE EXCEPTION 'Visit % already has inspection items.', v_visit_id;
    END IF;

    UPDATE public.visits
    SET
      store_id      = p_store_id,
      store_name    = trim(p_store_name),
      general_notes = NULLIF(trim(p_general_notes), ''),
      started_at    = COALESCE(p_started_at, started_at),
      updated_at    = NOW()
    WHERE id = v_visit_id;
  END IF;

  v_display_order := 0;

  FOR v_observation IN
    SELECT value
    FROM jsonb_array_elements(p_observations)
  LOOP
    IF v_observation ->> 'visit_status_id' IS NULL THEN
      RAISE EXCEPTION
        'Every inspection item must have a status before submitting the visit.';
    END IF;

    IF v_observation ->> 'brand' IS NULL
       OR char_length(trim(v_observation ->> 'brand')) = 0 THEN
      RAISE EXCEPTION
        'Every inspection item must have a brand before submitting the visit.';
    END IF;

    IF v_observation ->> 'product_name' IS NULL
       OR char_length(trim(v_observation ->> 'product_name')) = 0 THEN
      RAISE EXCEPTION
        'Every inspection item must have a product before submitting the visit.';
    END IF;

    INSERT INTO public.visit_observations (
      visit_id,
      visit_status_id,
      store_name,
      brand,
      sub_category,
      item_code,
      product_name,
      display_qty,
      notes,
      display_order
    )
    VALUES (
      v_visit_id,
      (v_observation ->> 'visit_status_id')::UUID,
      trim(v_observation ->> 'store_name'),
      trim(v_observation ->> 'brand'),
      trim(v_observation ->> 'sub_category'),
      trim(v_observation ->> 'item_code'),
      trim(v_observation ->> 'product_name'),
      COALESCE((v_observation ->> 'display_qty')::INTEGER, 0),
      NULLIF(trim(v_observation ->> 'notes'), ''),
      COALESCE((v_observation ->> 'display_order')::INTEGER, v_display_order)
    );

    v_display_order := v_display_order + 1;
  END LOOP;

  SELECT COUNT(*)
  INTO v_observation_count
  FROM public.visit_observations
  WHERE visit_id = v_visit_id;

  IF v_observation_count = 0 THEN
    RAISE EXCEPTION
      'At least one inspection item is required before submitting the visit.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.visit_observations AS vo
    LEFT JOIN public.visit_statuses AS vs ON vs.id = vo.visit_status_id
    WHERE vo.visit_id = v_visit_id
      AND (vs.id IS NULL OR vs.is_active = FALSE)
  ) THEN
    RAISE EXCEPTION
      'Every inspection item must have a valid active status before submitting the visit.';
  END IF;

  v_display_order := 0;

  FOR v_photo IN
    SELECT value
    FROM jsonb_array_elements(p_photos)
  LOOP
    IF v_photo ->> 'id' IS NULL THEN
      RAISE EXCEPTION 'Each photo must include an id.';
    END IF;

    IF v_photo ->> 'storage_path' IS NULL
       OR char_length(trim(v_photo ->> 'storage_path')) = 0 THEN
      RAISE EXCEPTION 'Each photo must include a storage_path.';
    END IF;

    IF v_photo ->> 'file_name' IS NULL
       OR char_length(trim(v_photo ->> 'file_name')) = 0 THEN
      RAISE EXCEPTION 'Each photo must include a file_name.';
    END IF;

    INSERT INTO public.visit_photos (
      id,
      visit_id,
      visit_observation_id,
      uploaded_by,
      storage_path,
      file_name,
      photo_type,
      mime_type,
      file_size_bytes,
      sort_order,
      is_active
    )
    VALUES (
      (v_photo ->> 'id')::UUID,
      v_visit_id,
      NULL,
      auth.uid(),
      trim(v_photo ->> 'storage_path'),
      trim(v_photo ->> 'file_name'),
      COALESCE(NULLIF(trim(v_photo ->> 'photo_type'), ''), 'General'),
      NULLIF(trim(v_photo ->> 'mime_type'), ''),
      NULLIF(v_photo ->> 'file_size_bytes', '')::BIGINT,
      COALESCE((v_photo ->> 'sort_order')::INTEGER, v_display_order),
      TRUE
    );

    v_display_order := v_display_order + 1;
  END LOOP;

  UPDATE public.visits
  SET
    status       = 'Submitted',
    submitted_at = v_submitted_at,
    submitted_by = auth.uid(),
    updated_at   = NOW()
  WHERE id = v_visit_id
    AND status = 'Draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % could not be submitted.', v_visit_id;
  END IF;

  RETURN v_visit_id;
END;
$$;

COMMENT ON FUNCTION public.submit_visit_complete(
  UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, UUID, JSONB, JSONB
) IS
  'Atomically saves a submitted visit, its inspection items, and visit-level photo metadata.';

GRANT EXECUTE ON FUNCTION public.register_draft_visit(UUID, UUID, TEXT, TIMESTAMPTZ, UUID)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.abort_draft_visit(UUID)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.submit_visit_complete(
  UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, UUID, JSONB, JSONB
) TO authenticated;
