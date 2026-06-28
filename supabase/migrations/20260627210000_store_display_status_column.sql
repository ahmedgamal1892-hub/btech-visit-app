-- Historical migration retained for confirm_snapshot_import rollout.

CREATE OR REPLACE FUNCTION public.confirm_snapshot_import(
  p_uploaded_by         UUID,
  p_file_name           TEXT,
  p_storage_path        TEXT,
  p_display_hash        TEXT,
  p_ach_hash            TEXT,
  p_validation_report   JSONB,
  p_stores              JSONB,
  p_store_display       JSONB,
  p_sales_achievement   JSONB
)
RETURNS public.import_batches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_batch_id   UUID;
  v_new_batch      public.import_batches;
  v_current_batch  public.import_batches;
  v_store_count    INTEGER;
  v_display_count  INTEGER;
  v_ach_count      INTEGER;
  v_store_row      JSONB;
  v_display_row    JSONB;
  v_ach_row        JSONB;
  v_store_id       UUID;
  v_store_name     TEXT;
BEGIN
  IF p_file_name IS NULL OR char_length(trim(p_file_name)) = 0 THEN
    RAISE EXCEPTION 'file_name is required.';
  END IF;

  IF jsonb_typeof(p_stores) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_store_display) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_sales_achievement) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'stores, store_display, and sales_achievement must be JSON arrays.';
  END IF;

  IF jsonb_array_length(p_stores) = 0 THEN
    RAISE EXCEPTION 'stores payload must not be empty.';
  END IF;

  IF jsonb_array_length(p_store_display) = 0 THEN
    RAISE EXCEPTION 'store_display payload must not be empty.';
  END IF;

  IF jsonb_array_length(p_sales_achievement) = 0 THEN
    RAISE EXCEPTION 'sales_achievement payload must not be empty.';
  END IF;

  v_display_count := jsonb_array_length(p_store_display);
  v_ach_count := jsonb_array_length(p_sales_achievement);

  PERFORM pg_advisory_xact_lock(hashtext('visit_app_operational_snapshot_replace'));

  SELECT *
  INTO v_current_batch
  FROM public.import_batches
  WHERE is_current = TRUE
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.import_batches
    SET
      is_current    = FALSE,
      status        = 'superseded',
      superseded_at = NOW(),
      updated_at    = NOW()
    WHERE id = v_current_batch.id;
  END IF;

  DELETE FROM public.store_display WHERE import_batch_id IS NOT NULL;
  DELETE FROM public.sales_achievement WHERE import_batch_id IS NOT NULL;
  DELETE FROM public.stores WHERE batch_id IS NOT NULL;

  INSERT INTO public.import_batches (
    uploaded_by,
    file_name,
    storage_path,
    status,
    is_current,
    display_row_count,
    ach_row_count,
    display_hash,
    ach_hash,
    validation_report,
    validation_errors,
    confirmed_at
  )
  VALUES (
    p_uploaded_by,
    trim(p_file_name),
    p_storage_path,
    'confirmed',
    TRUE,
    v_display_count,
    v_ach_count,
    p_display_hash,
    p_ach_hash,
    p_validation_report,
    '[]'::JSONB,
    NOW()
  )
  RETURNING id
  INTO v_new_batch_id;

  CREATE TEMP TABLE tmp_store_map (
    store_name TEXT PRIMARY KEY,
    store_id   UUID NOT NULL
  ) ON COMMIT DROP;

  FOR v_store_row IN
    SELECT value
    FROM jsonb_array_elements(p_stores)
  LOOP
    v_store_name := trim(v_store_row ->> 'name');

    IF v_store_name IS NULL OR char_length(v_store_name) = 0 THEN
      RAISE EXCEPTION 'Each store row must include a non-empty name.';
    END IF;

    INSERT INTO public.stores (
      batch_id,
      name,
      budget_channel
    )
    VALUES (
      v_new_batch_id,
      v_store_name,
      NULLIF(trim(v_store_row ->> 'budget_channel'), '')
    )
    RETURNING id
    INTO v_store_id;

    INSERT INTO tmp_store_map (store_name, store_id)
    VALUES (v_store_name, v_store_id);
  END LOOP;

  SELECT COUNT(*)
  INTO v_store_count
  FROM tmp_store_map;

  IF v_store_count = 0 THEN
    RAISE EXCEPTION 'No stores were inserted from the payload.';
  END IF;

  FOR v_display_row IN
    SELECT value
    FROM jsonb_array_elements(p_store_display)
  LOOP
    v_store_name := trim(v_display_row ->> 'store_name');

    SELECT store_id
    INTO v_store_id
    FROM tmp_store_map
    WHERE store_name = v_store_name;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION
        'Display row references unknown store_name: %.',
        v_store_name;
    END IF;

    INSERT INTO public.store_display (
      import_batch_id,
      store_id,
      brand,
      sub_category,
      item_code,
      product_name,
      display_qty
    )
    VALUES (
      v_new_batch_id,
      v_store_id,
      trim(v_display_row ->> 'brand'),
      trim(v_display_row ->> 'sub_category'),
      trim(v_display_row ->> 'item_code'),
      trim(v_display_row ->> 'product_name'),
      COALESCE((v_display_row ->> 'display_qty')::INTEGER, 0)
    );
  END LOOP;

  FOR v_ach_row IN
    SELECT value
    FROM jsonb_array_elements(p_sales_achievement)
  LOOP
    v_store_name := trim(v_ach_row ->> 'store_name');

    SELECT store_id
    INTO v_store_id
    FROM tmp_store_map
    WHERE store_name = v_store_name;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION
        'ACH row references unknown store_name: %.',
        v_store_name;
    END IF;

    INSERT INTO public.sales_achievement (
      import_batch_id,
      store_id,
      brand,
      mtd_target,
      actual_sales,
      ach_percent
    )
    VALUES (
      v_new_batch_id,
      v_store_id,
      trim(v_ach_row ->> 'brand'),
      COALESCE((v_ach_row ->> 'mtd_target')::NUMERIC(14, 2), 0),
      COALESCE((v_ach_row ->> 'actual_sales')::NUMERIC(14, 2), 0),
      COALESCE((v_ach_row ->> 'ach_percent')::NUMERIC(7, 2), 0)
    );
  END LOOP;

  SELECT *
  INTO v_new_batch
  FROM public.import_batches
  WHERE id = v_new_batch_id;

  RETURN v_new_batch;
END;
$$;
