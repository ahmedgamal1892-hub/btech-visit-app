-- Visit history listing and Closed status support.

ALTER TABLE public.visits
  DROP CONSTRAINT IF EXISTS visits_status_check;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_status_check
  CHECK (status IN ('Draft', 'Submitted', 'Closed'));

ALTER TABLE public.visits
  DROP CONSTRAINT IF EXISTS visits_submitted_fields_check;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_submitted_fields_check
  CHECK (
    (
      status = 'Draft'
      AND submitted_at IS NULL
      AND submitted_by IS NULL
    )
    OR (
      status IN ('Submitted', 'Closed')
      AND submitted_at IS NOT NULL
      AND submitted_by IS NOT NULL
    )
  );

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
  v_row_index     INTEGER := 0;
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
    v_row_index := v_row_index + 1;

    v_rows := v_rows || jsonb_build_array(
      jsonb_build_object(
        'visit_id', v_row.visit_id,
        'visit_no', GREATEST(v_total_count - v_offset - v_row_index + 1, 1),
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

COMMENT ON FUNCTION public.list_visit_history(
  TEXT, UUID, UUID, TEXT, DATE, DATE, TEXT, TEXT, INTEGER, INTEGER
) IS
  'Returns paginated submitted visit history with filters, sorting, and counts.';

GRANT EXECUTE ON FUNCTION public.list_visit_history(
  TEXT, UUID, UUID, TEXT, DATE, DATE, TEXT, TEXT, INTEGER, INTEGER
) TO authenticated;
