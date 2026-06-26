-- Draft save support: branch reference, inspection item JSON, photo soft-removal.

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores (id) ON DELETE SET NULL;

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS draft_inspection_items JSONB NOT NULL DEFAULT '[]'::JSONB;

CREATE INDEX IF NOT EXISTS idx_visits_store_id
  ON public.visits (store_id);

COMMENT ON COLUMN public.visits.store_id IS
  'Selected branch (store) for the visit. Used when resuming Draft visits.';
COMMENT ON COLUMN public.visits.draft_inspection_items IS
  'Serialized inspection item UI state while the visit remains in Draft status.';

ALTER TABLE public.visit_photos
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_visit_photos_visit_active_sort
  ON public.visit_photos (visit_id, is_active, sort_order);

-- ---------------------------------------------------------------------------
-- Save or update a Draft visit (incomplete inspection items allowed).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_visit_draft(
  p_visit_id          UUID,
  p_store_id          UUID,
  p_store_name        TEXT,
  p_general_notes     TEXT,
  p_inspection_items  JSONB,
  p_started_at        TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit_id        UUID;
  v_import_batch_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'A branch must be selected before saving the draft.';
  END IF;

  IF p_store_name IS NULL OR char_length(trim(p_store_name)) = 0 THEN
    RAISE EXCEPTION 'A branch must be selected before saving the draft.';
  END IF;

  IF jsonb_typeof(p_inspection_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Inspection items payload must be a JSON array.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stores
    WHERE id = p_store_id
  ) THEN
    RAISE EXCEPTION 'Selected branch was not found.';
  END IF;

  SELECT (public.get_current_import_batch()).id
  INTO v_import_batch_id;

  IF p_visit_id IS NULL THEN
    INSERT INTO public.visits (
      user_id,
      import_batch_id,
      store_id,
      store_name,
      status,
      general_notes,
      draft_inspection_items,
      started_at
    )
    VALUES (
      auth.uid(),
      v_import_batch_id,
      p_store_id,
      trim(p_store_name),
      'Draft',
      NULLIF(trim(p_general_notes), ''),
      COALESCE(p_inspection_items, '[]'::JSONB),
      COALESCE(p_started_at, NOW())
    )
    RETURNING id
    INTO v_visit_id;
  ELSE
    UPDATE public.visits
    SET
      store_id               = p_store_id,
      store_name             = trim(p_store_name),
      general_notes          = NULLIF(trim(p_general_notes), ''),
      draft_inspection_items = COALESCE(p_inspection_items, '[]'::JSONB),
      import_batch_id        = COALESCE(import_batch_id, v_import_batch_id),
      updated_at             = NOW()
    WHERE id = p_visit_id
      AND user_id = auth.uid()
      AND status = 'Draft'
    RETURNING id
    INTO v_visit_id;

    IF v_visit_id IS NULL THEN
      RAISE EXCEPTION 'Draft visit % was not found or is no longer editable.', p_visit_id;
    END IF;
  END IF;

  RETURN v_visit_id;
END;
$$;

COMMENT ON FUNCTION public.save_visit_draft(
  UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ
) IS
  'Creates or updates a Draft visit with serialized inspection items.';

-- ---------------------------------------------------------------------------
-- Insert observations for an existing Draft visit at submit time.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.insert_draft_visit_observations(
  p_visit_id       UUID,
  p_observations   JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_observation     JSONB;
  v_observation_id  UUID;
  v_client_key      TEXT;
  v_display_order   INTEGER;
  v_result          JSONB := '[]'::JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF jsonb_typeof(p_observations) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Observations payload must be a JSON array.';
  END IF;

  IF jsonb_array_length(p_observations) = 0 THEN
    RAISE EXCEPTION 'At least one observation is required before submitting the visit.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.visits
    WHERE id = p_visit_id
      AND user_id = auth.uid()
      AND status = 'Draft'
  ) THEN
    RAISE EXCEPTION 'Draft visit % was not found or is no longer editable.', p_visit_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.visit_observations
    WHERE visit_id = p_visit_id
  ) THEN
    RAISE EXCEPTION
      'Visit % already has saved observations. Refresh and try again.',
      p_visit_id;
  END IF;

  v_display_order := 0;

  FOR v_observation IN
    SELECT value
    FROM jsonb_array_elements(p_observations)
  LOOP
    v_client_key := NULLIF(trim(v_observation ->> 'client_key'), '');

    IF v_client_key IS NULL THEN
      RAISE EXCEPTION 'Each observation must include a client_key.';
    END IF;

    IF v_observation ->> 'visit_status_id' IS NULL THEN
      RAISE EXCEPTION 'Every observation must have a status before submitting the visit.';
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
      p_visit_id,
      (v_observation ->> 'visit_status_id')::UUID,
      trim(v_observation ->> 'store_name'),
      trim(v_observation ->> 'brand'),
      trim(v_observation ->> 'sub_category'),
      trim(v_observation ->> 'item_code'),
      trim(v_observation ->> 'product_name'),
      COALESCE((v_observation ->> 'display_qty')::INTEGER, 0),
      NULLIF(trim(v_observation ->> 'notes'), ''),
      COALESCE((v_observation ->> 'display_order')::INTEGER, v_display_order)
    )
    RETURNING id
    INTO v_observation_id;

    v_result := v_result || jsonb_build_array(
      jsonb_build_object(
        'client_key', v_client_key,
        'observation_id', v_observation_id
      )
    );

    v_display_order := v_display_order + 1;
  END LOOP;

  UPDATE public.visits
  SET draft_inspection_items = '[]'::JSONB,
      updated_at = NOW()
  WHERE id = p_visit_id;

  RETURN jsonb_build_object(
    'visit_id', p_visit_id,
    'observations', v_result
  );
END;
$$;

COMMENT ON FUNCTION public.insert_draft_visit_observations(UUID, JSONB) IS
  'Materializes validated observations for an existing Draft visit before submission.';

GRANT EXECUTE ON FUNCTION public.save_visit_draft(
  UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.insert_draft_visit_observations(UUID, JSONB) TO authenticated;
