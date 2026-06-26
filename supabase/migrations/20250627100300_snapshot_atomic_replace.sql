-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 2
-- Migration: Atomic operational snapshot replacement (confirm-time only)
-- =============================================================================
--
-- Application workflow — no preview persistence:
--   1. Read Excel in memory.
--   2. Validate in memory.
--   3. Show Import Summary to Admin.
--   4. Wait for confirmation.
--   5. Call confirm_snapshot_import(...) — single DB transaction:
--        a. Supersede current batch
--        b. DELETE all snapshot rows (with WHERE for pg_safeupdate)
--        c. INSERT import_batches history row
--        d. INSERT stores, store_display, sales_achievement
--   6. COMMIT on success / ROLLBACK on any error
--   7. Log failed attempts separately via log_failed_import(...)
--
-- JSON payload shapes:
--   p_stores:            [{ "name": "...", "budget_channel": "..." }]
--   p_store_display:     [{ "store_name": "...", "brand": "...",
--                           "sub_category": "...", "item_code": "...",
--                           "product_name": "...", "display_qty": 0 }]
--   p_sales_achievement: [{ "store_name": "...", "brand": "...",
--                           "mtd_target": 0, "actual_sales": 0,
--                           "ach_percent": 0 }]
-- -----------------------------------------------------------------------------

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

  -- Prevent concurrent snapshot replacements.
  PERFORM pg_advisory_xact_lock(hashtext('visit_app_operational_snapshot_replace'));

  -- Lock and supersede the current operational batch, if one exists.
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

  -- Replace all operational snapshot rows (WHERE required by safe-delete policy).
  DELETE FROM public.store_display WHERE import_batch_id IS NOT NULL;
  DELETE FROM public.sales_achievement WHERE import_batch_id IS NOT NULL;
  DELETE FROM public.stores WHERE batch_id IS NOT NULL;

  -- Log the successful upload in import history.
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

  -- Insert stores and build a name -> id map in a temp table.
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

  -- Insert Display sheet rows.
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

  -- Insert ACH sheet rows.
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

COMMENT ON FUNCTION public.confirm_snapshot_import(
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB
) IS
  'Atomically replaces the operational snapshot and writes one confirmed import_batches history row.';

-- -----------------------------------------------------------------------------
-- Log a failed import attempt without touching the operational snapshot
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_failed_import(
  p_uploaded_by        UUID,
  p_file_name          TEXT,
  p_storage_path       TEXT DEFAULT NULL,
  p_display_hash       TEXT DEFAULT NULL,
  p_ach_hash           TEXT DEFAULT NULL,
  p_validation_report  JSONB DEFAULT NULL,
  p_validation_errors  JSONB DEFAULT '[]'::JSONB,
  p_error_log          JSONB DEFAULT NULL
)
RETURNS public.import_batches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.import_batches;
BEGIN
  IF p_file_name IS NULL OR char_length(trim(p_file_name)) = 0 THEN
    RAISE EXCEPTION 'file_name is required.';
  END IF;

  IF jsonb_typeof(p_validation_errors) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'validation_errors must be a JSON array.';
  END IF;

  INSERT INTO public.import_batches (
    uploaded_by,
    file_name,
    storage_path,
    status,
    is_current,
    display_hash,
    ach_hash,
    validation_report,
    validation_errors,
    error_log
  )
  VALUES (
    p_uploaded_by,
    trim(p_file_name),
    p_storage_path,
    'failed',
    FALSE,
    p_display_hash,
    p_ach_hash,
    p_validation_report,
    COALESCE(p_validation_errors, '[]'::JSONB),
    p_error_log
  )
  RETURNING *
  INTO v_batch;

  RETURN v_batch;
END;
$$;

COMMENT ON FUNCTION public.log_failed_import(
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB
) IS
  'Persists a failed import attempt to import history without modifying snapshot tables.';

-- -----------------------------------------------------------------------------
-- Read helper: return the current operational batch
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_current_import_batch()
RETURNS public.import_batches
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.import_batches
  WHERE is_current = TRUE
    AND status = 'confirmed'
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_import_batch() IS
  'Returns the current confirmed operational import batch, if one exists.';
