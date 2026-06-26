-- submit_visit_complete must return JSONB (visit_id, visit_number, status).
-- CREATE OR REPLACE cannot change return type from UUID to JSONB, so drop first.

DROP FUNCTION IF EXISTS public.submit_visit_complete(
  UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, UUID, JSONB, JSONB
);

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
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit_id          UUID;
  v_visit_number      TEXT;
  v_observation       JSONB;
  v_photo             JSONB;
  v_display_order     INTEGER;
  v_observation_count INTEGER;
  v_submitted_at      TIMESTAMPTZ := NOW();
  v_started_at        TIMESTAMPTZ := COALESCE(p_started_at, NOW());
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

  PERFORM set_config('app.visit_management', 'true', true);

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
      v_started_at
    );

    PERFORM public.record_visit_timeline_event(
      v_visit_id,
      'created',
      auth.uid(),
      v_started_at
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

    IF NOT EXISTS (
      SELECT 1
      FROM public.visit_timeline_events
      WHERE visit_id = v_visit_id
        AND event_type = 'created'
    ) THEN
      PERFORM public.record_visit_timeline_event(
        v_visit_id,
        'created',
        auth.uid(),
        v_started_at
      );
    END IF;
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

  v_visit_number := public.generate_visit_number(v_submitted_at);

  UPDATE public.visits
  SET
    visit_number = v_visit_number,
    status       = 'Submitted',
    submitted_at = v_submitted_at,
    submitted_by = auth.uid(),
    updated_at   = NOW()
  WHERE id = v_visit_id
    AND status = 'Draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % could not be submitted.', v_visit_id;
  END IF;

  PERFORM public.record_visit_timeline_event(
    v_visit_id,
    'submitted',
    auth.uid(),
    v_submitted_at
  );

  RETURN jsonb_build_object(
    'visit_id', v_visit_id,
    'visit_number', v_visit_number,
    'status', 'Submitted'
  );
END;
$$;

COMMENT ON FUNCTION public.submit_visit_complete(
  UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, UUID, JSONB, JSONB
) IS
  'Atomically submits a visit and returns visit_id, visit_number, and status.';

GRANT EXECUTE ON FUNCTION public.submit_visit_complete(
  UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, UUID, JSONB, JSONB
) TO authenticated;
