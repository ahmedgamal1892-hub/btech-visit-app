-- Atomically create a Draft visit and its observations for client-side photo upload + submit.

CREATE OR REPLACE FUNCTION public.create_visit_with_observations(
  p_store_name       TEXT,
  p_general_notes    TEXT,
  p_started_at       TIMESTAMPTZ,
  p_import_batch_id  UUID,
  p_observations     JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit_id        UUID;
  v_observation     JSONB;
  v_observation_id  UUID;
  v_client_key      TEXT;
  v_display_order   INTEGER;
  v_result          JSONB := '[]'::JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF p_store_name IS NULL OR char_length(trim(p_store_name)) = 0 THEN
    RAISE EXCEPTION 'A store must be selected before submitting the visit.';
  END IF;

  IF jsonb_typeof(p_observations) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Observations payload must be a JSON array.';
  END IF;

  IF jsonb_array_length(p_observations) = 0 THEN
    RAISE EXCEPTION 'At least one observation is required before submitting the visit.';
  END IF;

  INSERT INTO public.visits (
    user_id,
    import_batch_id,
    store_name,
    status,
    general_notes,
    started_at
  )
  VALUES (
    auth.uid(),
    p_import_batch_id,
    trim(p_store_name),
    'Draft',
    NULLIF(trim(p_general_notes), ''),
    COALESCE(p_started_at, NOW())
  )
  RETURNING id
  INTO v_visit_id;

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

  RETURN jsonb_build_object(
    'visit_id', v_visit_id,
    'observations', v_result
  );
END;
$$;

COMMENT ON FUNCTION public.create_visit_with_observations(
  TEXT, TEXT, TIMESTAMPTZ, UUID, JSONB
) IS
  'Creates a Draft visit and observations in one transaction before photo upload and submit_visit.';
