-- Remove legacy Display worksheet status column from store_display and redeploy confirm_snapshot_import.

DO $$
DECLARE
  v_legacy_column constant text := 'display_' || 'status';
  v_legacy_constraint constant text := 'store_display_display_' || 'status_check';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.store_display'::regclass
      AND conname = v_legacy_constraint
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.store_display DROP CONSTRAINT %I',
      v_legacy_constraint
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'store_display'
      AND column_name = v_legacy_column
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.store_display DROP COLUMN %I',
      v_legacy_column
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.confirm_snapshot_import(
  p_uploaded_by         UUID,
  p_file_name           TEXT,
  p_storage_path        TEXT,
  p_display_hash        TEXT,
  p_ach_hash            TEXT,
  p_ranking_hash        TEXT,
  p_validation_report   JSONB,
  p_stores              JSONB,
  p_store_display       JSONB,
  p_sales_achievement   JSONB,
  p_ranking             JSONB,
  p_import_display      BOOLEAN DEFAULT TRUE,
  p_import_ach          BOOLEAN DEFAULT TRUE,
  p_import_ranking      BOOLEAN DEFAULT FALSE
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
  v_ranking_count  INTEGER;
  v_store_row      JSONB;
  v_display_row    JSONB;
  v_ach_row        JSONB;
  v_ranking_row    JSONB;
  v_store_id       UUID;
  v_store_name     TEXT;
BEGIN
  IF p_file_name IS NULL OR char_length(trim(p_file_name)) = 0 THEN
    RAISE EXCEPTION 'file_name is required.';
  END IF;

  IF jsonb_typeof(p_stores) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_store_display) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_sales_achievement) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_ranking) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'stores, store_display, sales_achievement, and ranking must be JSON arrays.';
  END IF;

  IF jsonb_array_length(p_stores) = 0 THEN
    RAISE EXCEPTION 'stores payload must not be empty.';
  END IF;

  IF NOT p_import_display AND NOT p_import_ach AND NOT p_import_ranking THEN
    RAISE EXCEPTION 'At least one worksheet must be imported.';
  END IF;

  IF p_import_display AND jsonb_array_length(p_store_display) = 0 THEN
    RAISE EXCEPTION 'store_display payload must not be empty when importing Display.';
  END IF;

  IF p_import_ach AND jsonb_array_length(p_sales_achievement) = 0 THEN
    RAISE EXCEPTION 'sales_achievement payload must not be empty when importing ACH.';
  END IF;

  IF p_import_ranking AND jsonb_array_length(p_ranking) = 0 THEN
    RAISE EXCEPTION 'ranking payload must not be empty when importing Ranking.';
  END IF;

  v_display_count := CASE WHEN p_import_display THEN jsonb_array_length(p_store_display) ELSE 0 END;
  v_ach_count := CASE WHEN p_import_ach THEN jsonb_array_length(p_sales_achievement) ELSE 0 END;
  v_ranking_count := CASE WHEN p_import_ranking THEN jsonb_array_length(p_ranking) ELSE 0 END;

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

  CREATE TEMP TABLE tmp_display_copy ON COMMIT DROP AS
  SELECT sd.*
  FROM public.store_display AS sd
  WHERE v_current_batch.id IS NOT NULL
    AND sd.import_batch_id = v_current_batch.id;

  CREATE TEMP TABLE tmp_ach_copy ON COMMIT DROP AS
  SELECT sa.*
  FROM public.sales_achievement AS sa
  WHERE v_current_batch.id IS NOT NULL
    AND sa.import_batch_id = v_current_batch.id;

  CREATE TEMP TABLE tmp_ranking_copy ON COMMIT DROP AS
  SELECT sr.*
  FROM public.store_ranking AS sr
  WHERE v_current_batch.id IS NOT NULL
    AND sr.import_batch_id = v_current_batch.id;

  DELETE FROM public.store_display
  WHERE import_batch_id IS NOT NULL;

  DELETE FROM public.sales_achievement
  WHERE import_batch_id IS NOT NULL;

  DELETE FROM public.store_ranking
  WHERE import_batch_id IS NOT NULL;

  INSERT INTO public.import_batches (
    uploaded_by,
    file_name,
    storage_path,
    status,
    is_current,
    display_row_count,
    ach_row_count,
    ranking_row_count,
    display_hash,
    ach_hash,
    ranking_hash,
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
    v_ranking_count,
    p_display_hash,
    p_ach_hash,
    p_ranking_hash,
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

    SELECT s.id
    INTO v_store_id
    FROM public.stores AS s
    WHERE s.name = v_store_name
    ORDER BY
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM public.visits AS v
          WHERE v.store_id = s.id
        ) THEN 0
        ELSE 1
      END,
      s.created_at DESC
    LIMIT 1;

    IF v_store_id IS NULL THEN
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
    ELSE
      UPDATE public.stores
      SET
        batch_id       = v_new_batch_id,
        budget_channel = NULLIF(trim(v_store_row ->> 'budget_channel'), ''),
        updated_at     = NOW()
      WHERE id = v_store_id;
    END IF;

    INSERT INTO tmp_store_map (store_name, store_id)
    VALUES (v_store_name, v_store_id)
    ON CONFLICT (store_name) DO UPDATE
      SET store_id = EXCLUDED.store_id;
  END LOOP;

  IF NOT p_import_display AND v_current_batch.id IS NOT NULL THEN
    INSERT INTO tmp_store_map (store_name, store_id)
    SELECT s.name, s.id
    FROM tmp_display_copy AS sd
    JOIN public.stores AS s ON s.id = sd.store_id
    ON CONFLICT (store_name) DO NOTHING;
  END IF;

  IF NOT p_import_ach AND v_current_batch.id IS NOT NULL THEN
    INSERT INTO tmp_store_map (store_name, store_id)
    SELECT s.name, s.id
    FROM tmp_ach_copy AS sa
    JOIN public.stores AS s ON s.id = sa.store_id
    ON CONFLICT (store_name) DO NOTHING;
  END IF;

  IF NOT p_import_ranking AND v_current_batch.id IS NOT NULL THEN
    INSERT INTO tmp_store_map (store_name, store_id)
    SELECT s.name, s.id
    FROM tmp_ranking_copy AS sr
    JOIN public.stores AS s ON s.id = sr.store_id
    ON CONFLICT (store_name) DO NOTHING;
  END IF;

  FOR v_store_name IN
    SELECT DISTINCT store_name
    FROM tmp_store_map
  LOOP
    SELECT store_id
    INTO v_store_id
    FROM tmp_store_map
    WHERE store_name = v_store_name;

    UPDATE public.stores
    SET
      batch_id   = v_new_batch_id,
      updated_at = NOW()
    WHERE id = v_store_id;
  END LOOP;

  DELETE FROM public.stores AS s
  WHERE s.id NOT IN (SELECT store_id FROM tmp_store_map)
    AND NOT EXISTS (
      SELECT 1
      FROM public.visits AS v
      WHERE v.store_id = s.id
    );

  SELECT COUNT(*)
  INTO v_store_count
  FROM tmp_store_map;

  IF v_store_count = 0 THEN
    RAISE EXCEPTION 'No stores were inserted from the payload.';
  END IF;

  IF p_import_display THEN
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
  ELSE
    INSERT INTO public.store_display (
      import_batch_id,
      store_id,
      brand,
      sub_category,
      item_code,
      product_name,
      display_qty
    )
    SELECT
      v_new_batch_id,
      sm.store_id,
      sd.brand,
      sd.sub_category,
      sd.item_code,
      sd.product_name,
      sd.display_qty
    FROM tmp_display_copy AS sd
    JOIN public.stores AS s ON s.id = sd.store_id
    JOIN tmp_store_map AS sm ON sm.store_name = s.name;
  END IF;

  IF p_import_ach THEN
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
  ELSE
    INSERT INTO public.sales_achievement (
      import_batch_id,
      store_id,
      brand,
      mtd_target,
      actual_sales,
      ach_percent
    )
    SELECT
      v_new_batch_id,
      sm.store_id,
      sa.brand,
      sa.mtd_target,
      sa.actual_sales,
      sa.ach_percent
    FROM tmp_ach_copy AS sa
    JOIN public.stores AS s ON s.id = sa.store_id
    JOIN tmp_store_map AS sm ON sm.store_name = s.name;
  END IF;

  IF p_import_ranking THEN
    FOR v_ranking_row IN
      SELECT value
      FROM jsonb_array_elements(p_ranking)
    LOOP
      v_store_name := trim(v_ranking_row ->> 'store_name');

      SELECT store_id
      INTO v_store_id
      FROM tmp_store_map
      WHERE store_name = v_store_name;

      IF v_store_id IS NULL THEN
        RAISE EXCEPTION
          'Ranking row references unknown store_name: %.',
          v_store_name;
      END IF;

      INSERT INTO public.store_ranking (
        import_batch_id,
        store_id,
        brand,
        category,
        qty,
        sales
      )
      VALUES (
        v_new_batch_id,
        v_store_id,
        trim(v_ranking_row ->> 'brand'),
        trim(v_ranking_row ->> 'category'),
        COALESCE((v_ranking_row ->> 'qty')::INTEGER, 0),
        COALESCE((v_ranking_row ->> 'sales')::NUMERIC(14, 2), 0)
      );
    END LOOP;
  ELSE
    INSERT INTO public.store_ranking (
      import_batch_id,
      store_id,
      brand,
      category,
      qty,
      sales
    )
    SELECT
      v_new_batch_id,
      sm.store_id,
      sr.brand,
      sr.category,
      sr.qty,
      sr.sales
    FROM tmp_ranking_copy AS sr
    JOIN public.stores AS s ON s.id = sr.store_id
    JOIN tmp_store_map AS sm ON sm.store_name = s.name;
  END IF;

  SELECT *
  INTO v_new_batch
  FROM public.import_batches
  WHERE id = v_new_batch_id;

  RETURN v_new_batch;
END;
$$;

COMMENT ON FUNCTION public.confirm_snapshot_import(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN, BOOLEAN
) IS
  'Atomically replaces the operational snapshot. Supports partial daily workbook imports with copy-forward for skipped sheets.';
