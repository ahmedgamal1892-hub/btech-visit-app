-- Human-readable visit numbers: VIS-YYYYMMDD-0001 (daily sequence, unique).

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS visit_number TEXT;

COMMENT ON COLUMN public.visits.visit_number IS
  'Human-readable visit reference (VIS-YYYYMMDD-0001). Used in history, details, and PDF reports.';

CREATE TABLE IF NOT EXISTS public.visit_number_daily_sequences (
  sequence_date DATE PRIMARY KEY,
  last_value    INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT visit_number_daily_sequences_last_value_check
    CHECK (last_value >= 0)
);

COMMENT ON TABLE public.visit_number_daily_sequences IS
  'Daily counter for generating unique visit numbers.';

CREATE OR REPLACE FUNCTION public.generate_visit_number(
  p_reference_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence_date DATE := (timezone('UTC', p_reference_at))::DATE;
  v_sequence      INTEGER;
  v_date_part     TEXT := to_char(v_sequence_date, 'YYYYMMDD');
BEGIN
  INSERT INTO public.visit_number_daily_sequences AS seq (sequence_date, last_value)
  VALUES (v_sequence_date, 1)
  ON CONFLICT (sequence_date)
  DO UPDATE
  SET last_value = seq.last_value + 1
  RETURNING last_value
  INTO v_sequence;

  RETURN 'VIS-' || v_date_part || '-' || lpad(v_sequence::TEXT, 4, '0');
END;
$$;

COMMENT ON FUNCTION public.generate_visit_number(TIMESTAMPTZ) IS
  'Generates the next unique visit number for the UTC date of the submission timestamp.';

-- Backfill existing submitted visits in chronological order.
-- Temporarily disable immutability trigger (visit_management bypass not applied yet).
ALTER TABLE public.visits DISABLE TRIGGER prevent_submitted_visit_mutation;

DO $$
DECLARE
  v_visit RECORD;
BEGIN
  FOR v_visit IN
    SELECT id, submitted_at
    FROM public.visits
    WHERE status IN ('Submitted', 'Closed')
      AND visit_number IS NULL
      AND submitted_at IS NOT NULL
    ORDER BY submitted_at ASC, id ASC
  LOOP
    UPDATE public.visits
    SET visit_number = public.generate_visit_number(v_visit.submitted_at)
    WHERE id = v_visit.id;
  END LOOP;
END;
$$;

ALTER TABLE public.visits ENABLE TRIGGER prevent_submitted_visit_mutation;

CREATE UNIQUE INDEX IF NOT EXISTS uq_visits_visit_number
  ON public.visits (visit_number)
  WHERE visit_number IS NOT NULL;

ALTER TABLE public.visits
  DROP CONSTRAINT IF EXISTS visits_visit_number_format_check;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_visit_number_format_check
  CHECK (
    visit_number IS NULL
    OR visit_number ~ '^VIS-[0-9]{8}-[0-9]{4}$'
  );

ALTER TABLE public.visits
  DROP CONSTRAINT IF EXISTS visits_submitted_visit_number_check;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_submitted_visit_number_check
  CHECK (
    status = 'Draft'
    OR visit_number IS NOT NULL
  );

-- Assign visit number when submitting atomically.
-- Must drop first: original submit_visit_complete returned UUID, not JSONB.
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
  v_visit_id        UUID;
  v_visit_number    TEXT;
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

  RETURN jsonb_build_object(
    'visit_id', v_visit_id,
    'visit_number', v_visit_number
  );
END;
$$;

COMMENT ON FUNCTION public.submit_visit_complete(
  UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, UUID, JSONB, JSONB
) IS
  'Atomically saves a submitted visit, its inspection items, photo metadata, and visit number.';

-- Visit history: return visit_number and support searching by it.
CREATE OR REPLACE FUNCTION public.list_visit_history(
  p_search       TEXT DEFAULT NULL,
  p_store_id     UUID DEFAULT NULL,
  p_visitor_id   UUID DEFAULT NULL,
  p_status       TEXT DEFAULT NULL,
  p_from_date    DATE DEFAULT NULL,
  p_to_date      DATE DEFAULT NULL,
  p_sort_by      TEXT DEFAULT 'visit_date',
  p_sort_dir     TEXT DEFAULT 'desc',
  p_page         INTEGER DEFAULT 1,
  p_page_size    INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search        TEXT := NULLIF(trim(p_search), '');
  v_status        TEXT := NULLIF(trim(p_status), '');
  v_sort_by       TEXT := lower(coalesce(p_sort_by, 'visit_date'));
  v_sort_dir      TEXT := lower(coalesce(p_sort_dir, 'desc'));
  v_page          INTEGER := GREATEST(coalesce(p_page, 1), 1);
  v_page_size     INTEGER := LEAST(GREATEST(coalesce(p_page_size, 20), 1), 100);
  v_offset        INTEGER;
  v_total_count   BIGINT;
  v_total_pages   INTEGER;
  v_order_column  TEXT;
  v_rows          JSONB := '[]'::JSONB;
  v_row           RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF v_sort_by NOT IN ('visit_date', 'branch', 'visitor') THEN
    v_sort_by := 'visit_date';
  END IF;

  IF v_sort_dir NOT IN ('asc', 'desc') THEN
    v_sort_dir := 'desc';
  END IF;

  v_order_column := CASE v_sort_by
    WHEN 'branch' THEN 'store_name'
    WHEN 'visitor' THEN 'visitor_name'
    ELSE 'visit_date'
  END;

  v_offset := (v_page - 1) * v_page_size;

  CREATE TEMP TABLE tmp_visit_history ON COMMIT DROP AS
  SELECT
    v.id AS visit_id,
    v.visit_number,
    COALESCE(v.submitted_at, v.started_at) AS visit_date,
    v.store_name,
    v.store_id,
    v.status,
    v.user_id AS visitor_id,
    NULLIF(trim(p.full_name), '') AS visitor_full_name,
    p.username AS visitor_username,
    COALESCE(
      NULLIF(trim(p.full_name), ''),
      p.username,
      'Unknown visitor'
    ) AS visitor_name,
    (
      SELECT COUNT(*)
      FROM public.visit_observations AS vo
      WHERE vo.visit_id = v.id
    )::INTEGER AS inspection_items_count,
    (
      SELECT COUNT(*)
      FROM public.visit_photos AS vp
      WHERE vp.visit_id = v.id
        AND vp.is_active = TRUE
    )::INTEGER AS photos_count
  FROM public.visits AS v
  INNER JOIN public.profiles AS p ON p.id = v.user_id
  WHERE v.status IN ('Submitted', 'Closed')
    AND (
      public.is_admin()
      OR v.user_id = auth.uid()
    )
    AND (
      v_search IS NULL
      OR v.visit_number ILIKE '%' || replace(replace(v_search, '%', ''), '_', '') || '%'
      OR v.store_name ILIKE '%' || replace(replace(v_search, '%', ''), '_', '') || '%'
      OR COALESCE(NULLIF(trim(p.full_name), ''), '') ILIKE '%' || replace(replace(v_search, '%', ''), '_', '') || '%'
      OR p.username ILIKE '%' || replace(replace(v_search, '%', ''), '_', '') || '%'
    )
    AND (p_store_id IS NULL OR v.store_id = p_store_id)
    AND (p_visitor_id IS NULL OR v.user_id = p_visitor_id)
    AND (
      v_status IS NULL
      OR v_status = 'all'
      OR v.status = v_status
    )
    AND (
      p_from_date IS NULL
      OR COALESCE(v.submitted_at, v.started_at)::DATE >= p_from_date
    )
    AND (
      p_to_date IS NULL
      OR COALESCE(v.submitted_at, v.started_at)::DATE <= p_to_date
    );

  SELECT COUNT(*)
  INTO v_total_count
  FROM tmp_visit_history;

  v_total_pages := GREATEST(1, CEIL(v_total_count::NUMERIC / v_page_size::NUMERIC)::INTEGER);

  FOR v_row IN EXECUTE format(
    'SELECT *
     FROM tmp_visit_history
     ORDER BY %I %s NULLS LAST, visit_id DESC
     LIMIT %s OFFSET %s',
    v_order_column,
    CASE WHEN v_sort_dir = 'asc' THEN 'ASC' ELSE 'DESC' END,
    v_page_size,
    v_offset
  )
  LOOP
    v_rows := v_rows || jsonb_build_array(
      jsonb_build_object(
        'visit_id', v_row.visit_id,
        'visit_number', v_row.visit_number,
        'visit_date', v_row.visit_date,
        'branch_name', v_row.store_name,
        'branch_id', v_row.store_id,
        'visitor_id', v_row.visitor_id,
        'visitor_name', v_row.visitor_name,
        'inspection_items_count', v_row.inspection_items_count,
        'photos_count', v_row.photos_count,
        'status', v_row.status
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total_count', v_total_count,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', v_total_pages
  );
END;
$$;

-- Summary for visit details and PDF report reference.
CREATE OR REPLACE FUNCTION public.get_visit_summary(p_visit_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit public.visits;
  v_visitor_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  SELECT *
  INTO v_visit
  FROM public.visits
  WHERE id = p_visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', p_visit_id;
  END IF;

  IF NOT public.is_admin() AND v_visit.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You are not authorized to view this visit.';
  END IF;

  IF v_visit.status = 'Draft' THEN
    RAISE EXCEPTION 'Visit % is not available for viewing.', p_visit_id;
  END IF;

  SELECT COALESCE(NULLIF(trim(full_name), ''), username, 'Unknown visitor')
  INTO v_visitor_name
  FROM public.profiles
  WHERE id = v_visit.user_id;

  RETURN jsonb_build_object(
    'visit_id', v_visit.id,
    'visit_number', v_visit.visit_number,
    'visit_date', COALESCE(v_visit.submitted_at, v_visit.started_at),
    'branch_name', v_visit.store_name,
    'branch_id', v_visit.store_id,
    'visitor_id', v_visit.user_id,
    'visitor_name', v_visitor_name,
    'status', v_visit.status,
    'general_notes', v_visit.general_notes,
    'pdf_report_reference', v_visit.visit_number
  );
END;
$$;

COMMENT ON FUNCTION public.get_visit_summary(UUID) IS
  'Returns visit header data including visit_number for details and PDF report reference.';

-- Default PDF file names to the visit number reference.
CREATE OR REPLACE FUNCTION public.create_visit_pdf_report(
  p_visit_id       UUID,
  p_storage_path   TEXT,
  p_file_name      TEXT DEFAULT NULL,
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
  v_visit_number TEXT;
  v_file_name TEXT;
BEGIN
  SELECT status, visit_number
  INTO v_visit_status, v_visit_number
  FROM public.visits
  WHERE id = p_visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', p_visit_id;
  END IF;

  IF v_visit_status IS DISTINCT FROM 'Submitted' AND v_visit_status IS DISTINCT FROM 'Closed' THEN
    RAISE EXCEPTION
      'PDF reports can only be generated after visit % is submitted.',
      p_visit_id;
  END IF;

  IF v_visit_number IS NULL THEN
    RAISE EXCEPTION 'Visit % does not have a visit number.', p_visit_id;
  END IF;

  IF NOT public.is_admin() AND NOT public.owns_visit(p_visit_id) THEN
    RAISE EXCEPTION 'You are not authorized to create a PDF for this visit.';
  END IF;

  v_file_name := COALESCE(NULLIF(trim(p_file_name), ''), v_visit_number || '.pdf');

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
    v_file_name,
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
  'Creates a PDF report for a submitted visit. Defaults file_name to {visit_number}.pdf.';

GRANT EXECUTE ON FUNCTION public.generate_visit_number(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visit_summary(UUID) TO authenticated;
