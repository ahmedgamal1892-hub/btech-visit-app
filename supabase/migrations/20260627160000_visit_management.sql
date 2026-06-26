-- Visit management: lifecycle, timeline, review, and follow-up visits.

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS parent_visit_id UUID REFERENCES public.visits (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS review_decision TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visits_parent_visit_id
  ON public.visits (parent_visit_id);

CREATE INDEX IF NOT EXISTS idx_visits_review_decision
  ON public.visits (review_decision);

ALTER TABLE public.visits
  DROP CONSTRAINT IF EXISTS visits_status_check;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_status_check
  CHECK (status IN ('Draft', 'Submitted', 'Reviewed', 'Closed'));

ALTER TABLE public.visits
  DROP CONSTRAINT IF EXISTS visits_review_decision_check;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_review_decision_check
  CHECK (
    review_decision IS NULL
    OR review_decision IN ('approve', 'needs_follow_up', 'close')
  );

ALTER TABLE public.visits
  DROP CONSTRAINT IF EXISTS visits_submitted_fields_check;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_submitted_fields_check
  CHECK (
    (
      status = 'Draft'
      AND submitted_at IS NULL
      AND submitted_by IS NULL
      AND reviewed_at IS NULL
      AND reviewed_by IS NULL
      AND closed_at IS NULL
      AND closed_by IS NULL
    )
    OR (
      status IN ('Submitted', 'Reviewed', 'Closed')
      AND submitted_at IS NOT NULL
      AND submitted_by IS NOT NULL
    )
  );

CREATE TABLE IF NOT EXISTS public.visit_timeline_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id   UUID        NOT NULL REFERENCES public.visits (id) ON DELETE CASCADE,
  event_type TEXT        NOT NULL,
  user_id    UUID        REFERENCES public.profiles (id) ON DELETE SET NULL,
  event_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT visit_timeline_events_event_type_check
    CHECK (event_type IN ('created', 'submitted', 'reviewed', 'closed')),

  CONSTRAINT visit_timeline_events_visit_event_unique
    UNIQUE (visit_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_visit_timeline_events_visit_event_at
  ON public.visit_timeline_events (visit_id, event_at);

COMMENT ON TABLE public.visit_timeline_events IS
  'Lifecycle timeline for visits: created, submitted, reviewed, closed.';

CREATE OR REPLACE FUNCTION public.record_visit_timeline_event(
  p_visit_id   UUID,
  p_event_type TEXT,
  p_user_id    UUID,
  p_event_at   TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.visit_timeline_events (visit_id, event_type, user_id, event_at)
  VALUES (p_visit_id, p_event_type, p_user_id, COALESCE(p_event_at, NOW()))
  ON CONFLICT (visit_id, event_type)
  DO UPDATE
  SET
    user_id  = EXCLUDED.user_id,
    event_at = EXCLUDED.event_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_submitted_visit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.allow_draft_cleanup', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF current_setting('app.visit_management', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IN ('Submitted', 'Reviewed', 'Closed') THEN
    RAISE EXCEPTION
      'Visit % is % and cannot be updated directly.',
      OLD.id,
      lower(OLD.status);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Visits are never deleted.';
  END IF;

  RETURN NEW;
END;
$$;

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

  IF current_setting('app.visit_management', true) = 'true' THEN
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

  IF v_visit_status IN ('Submitted', 'Reviewed', 'Closed') THEN
    RAISE EXCEPTION
      'Visit % is % and % rows are immutable.',
      v_visit_id,
      lower(v_visit_status),
      TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_visit(
  p_visit_id      UUID,
  p_review_notes  TEXT,
  p_decision      TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit public.visits;
  v_now   TIMESTAMPTZ := NOW();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can review visits.';
  END IF;

  IF p_decision NOT IN ('approve', 'needs_follow_up', 'close') THEN
    RAISE EXCEPTION 'Invalid review decision.';
  END IF;

  SELECT *
  INTO v_visit
  FROM public.visits
  WHERE id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', p_visit_id;
  END IF;

  IF v_visit.status = 'Draft' THEN
    RAISE EXCEPTION 'Draft visits cannot be reviewed.';
  END IF;

  IF v_visit.status = 'Closed' THEN
    RAISE EXCEPTION 'Closed visits cannot be reviewed.';
  END IF;

  IF v_visit.status = 'Reviewed' AND p_decision <> 'close' THEN
    RAISE EXCEPTION 'Reviewed visits can only be closed.';
  END IF;

  PERFORM set_config('app.visit_management', 'true', true);

  IF p_decision = 'close' THEN
    UPDATE public.visits
    SET
      status          = 'Closed',
      review_notes    = NULLIF(trim(p_review_notes), ''),
      review_decision = 'close',
      reviewed_at     = COALESCE(reviewed_at, v_now),
      reviewed_by     = COALESCE(reviewed_by, auth.uid()),
      closed_at       = v_now,
      closed_by       = auth.uid(),
      updated_at      = v_now
    WHERE id = p_visit_id;
  ELSE
    UPDATE public.visits
    SET
      status          = 'Reviewed',
      review_notes    = NULLIF(trim(p_review_notes), ''),
      review_decision = p_decision,
      reviewed_at     = v_now,
      reviewed_by     = auth.uid(),
      updated_at      = v_now
    WHERE id = p_visit_id;
  END IF;

  IF p_decision = 'close' THEN
    IF v_visit.status = 'Submitted' THEN
      PERFORM public.record_visit_timeline_event(
        p_visit_id,
        'reviewed',
        auth.uid(),
        v_now
      );
    END IF;

    PERFORM public.record_visit_timeline_event(
      p_visit_id,
      'closed',
      auth.uid(),
      v_now
    );
  ELSE
    PERFORM public.record_visit_timeline_event(
      p_visit_id,
      'reviewed',
      auth.uid(),
      v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'visit_id', p_visit_id,
    'status', CASE WHEN p_decision = 'close' THEN 'Closed' ELSE 'Reviewed' END,
    'review_decision', p_decision
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_follow_up_visit(p_parent_visit_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent public.visits;
  v_child_id UUID;
  v_import_batch_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  SELECT *
  INTO v_parent
  FROM public.visits
  WHERE id = p_parent_visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', p_parent_visit_id;
  END IF;

  IF NOT public.is_admin() AND v_parent.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You are not authorized to create a follow-up for this visit.';
  END IF;

  IF v_parent.review_decision IS DISTINCT FROM 'needs_follow_up' THEN
    RAISE EXCEPTION 'Follow-up visits can only be created after a needs follow-up review.';
  END IF;

  IF v_parent.store_id IS NULL THEN
    RAISE EXCEPTION 'Parent visit does not have a branch reference.';
  END IF;

  SELECT (public.get_current_import_batch()).id
  INTO v_import_batch_id;

  v_child_id := gen_random_uuid();

  PERFORM set_config('app.visit_management', 'true', true);

  INSERT INTO public.visits (
    id,
    user_id,
    import_batch_id,
    parent_visit_id,
    store_id,
    store_name,
    status,
    started_at
  )
  VALUES (
    v_child_id,
    auth.uid(),
    v_import_batch_id,
    p_parent_visit_id,
    v_parent.store_id,
    v_parent.store_name,
    'Draft',
    NOW()
  );

  PERFORM public.record_visit_timeline_event(
    v_child_id,
    'created',
    auth.uid(),
    NOW()
  );

  RETURN v_child_id;
END;
$$;

-- Backfill timeline for existing non-draft visits.
INSERT INTO public.visit_timeline_events (visit_id, event_type, user_id, event_at)
SELECT id, 'created', user_id, started_at
FROM public.visits
ON CONFLICT (visit_id, event_type) DO NOTHING;

INSERT INTO public.visit_timeline_events (visit_id, event_type, user_id, event_at)
SELECT id, 'submitted', submitted_by, submitted_at
FROM public.visits
WHERE submitted_at IS NOT NULL
ON CONFLICT (visit_id, event_type) DO NOTHING;

GRANT EXECUTE ON FUNCTION public.review_visit(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_follow_up_visit(UUID) TO authenticated;

-- Record timeline when reserving a draft visit shell.
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

  PERFORM set_config('app.visit_management', 'true', true);

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

  PERFORM public.record_visit_timeline_event(
    p_visit_id,
    'created',
    auth.uid(),
    COALESCE(p_started_at, NOW())
  );

  RETURN p_visit_id;
END;
$$;

-- Submit visit and record lifecycle timeline events.
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
  v_is_new_visit      BOOLEAN := FALSE;
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
    v_is_new_visit := TRUE;

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
    'visit_number', v_visit_number
  );
END;
$$;

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
    v.review_decision,
    v.user_id AS visitor_id,
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
  WHERE (
      public.is_admin()
      OR v.user_id = auth.uid()
    )
    AND (
      v_search IS NULL
      OR COALESCE(v.visit_number, '') ILIKE '%' || replace(replace(v_search, '%', ''), '_', '') || '%'
      OR v.store_name ILIKE '%' || replace(replace(v_search, '%', ''), '_', '') || '%'
      OR COALESCE(NULLIF(trim(p.full_name), ''), '') ILIKE '%' || replace(replace(v_search, '%', ''), '_', '') || '%'
      OR p.username ILIKE '%' || replace(replace(v_search, '%', ''), '_', '') || '%'
    )
    AND (p_store_id IS NULL OR v.store_id = p_store_id)
    AND (p_visitor_id IS NULL OR v.user_id = p_visitor_id)
    AND (
      v_status IS NULL
      OR v_status = 'all'
      OR (
        v_status = 'needs_follow_up'
        AND v.review_decision = 'needs_follow_up'
      )
      OR (
        v_status <> 'needs_follow_up'
        AND v.status = v_status
      )
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
        'status', v_row.status,
        'review_decision', v_row.review_decision
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

CREATE OR REPLACE FUNCTION public.get_visit_details(p_visit_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit public.visits;
  v_visitor_name TEXT;
  v_performance JSONB := '[]'::JSONB;
  v_inspection_items JSONB := '[]'::JSONB;
  v_photos JSONB := '[]'::JSONB;
  v_timeline JSONB := '[]'::JSONB;
  v_related_visits JSONB := '[]'::JSONB;
  v_reviewer_name TEXT;
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

  IF v_visit.reviewed_by IS NOT NULL THEN
    SELECT COALESCE(NULLIF(trim(full_name), ''), username, 'Unknown reviewer')
    INTO v_reviewer_name
    FROM public.profiles
    WHERE id = v_visit.reviewed_by;
  END IF;

  IF v_visit.store_id IS NOT NULL AND v_visit.import_batch_id IS NOT NULL THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'brand', sa.brand,
          'mtd_target', sa.mtd_target,
          'actual_sales', sa.actual_sales,
          'achievement_percent', sa.ach_percent
        )
        ORDER BY sa.brand
      ),
      '[]'::JSONB
    )
    INTO v_performance
    FROM public.sales_achievement AS sa
    WHERE sa.store_id = v_visit.store_id
      AND sa.import_batch_id = v_visit.import_batch_id;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', vo.id,
        'brand', vo.brand,
        'product_name', vo.product_name,
        'status_label', vs.label,
        'status_code', vs.code,
        'notes', vo.notes,
        'display_order', vo.display_order
      )
      ORDER BY vo.display_order
    ),
    '[]'::JSONB
  )
  INTO v_inspection_items
  FROM public.visit_observations AS vo
  INNER JOIN public.visit_statuses AS vs ON vs.id = vo.visit_status_id
  WHERE vo.visit_id = p_visit_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', vp.id,
        'storage_path', vp.storage_path,
        'file_name', vp.file_name,
        'sort_order', vp.sort_order
      )
      ORDER BY vp.sort_order
    ),
    '[]'::JSONB
  )
  INTO v_photos
  FROM public.visit_photos AS vp
  WHERE vp.visit_id = p_visit_id
    AND vp.is_active = TRUE;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'event_type', te.event_type,
        'event_label', CASE te.event_type
          WHEN 'created' THEN 'Visit Created'
          WHEN 'submitted' THEN 'Submitted'
          WHEN 'reviewed' THEN 'Reviewed'
          WHEN 'closed' THEN 'Closed'
          ELSE te.event_type
        END,
        'user_id', te.user_id,
        'user_name', COALESCE(
          NULLIF(trim(pr.full_name), ''),
          pr.username,
          'Unknown user'
        ),
        'event_at', te.event_at
      )
      ORDER BY te.event_at
    ),
    '[]'::JSONB
  )
  INTO v_timeline
  FROM public.visit_timeline_events AS te
  LEFT JOIN public.profiles AS pr ON pr.id = te.user_id
  WHERE te.visit_id = p_visit_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'visit_id', rv.id,
        'visit_number', rv.visit_number,
        'status', rv.status,
        'review_decision', rv.review_decision,
        'relationship', rv.relationship
      )
      ORDER BY rv.sort_order
    ),
    '[]'::JSONB
  )
  INTO v_related_visits
  FROM (
    SELECT
      parent.id AS id,
      parent.visit_number,
      parent.status,
      parent.review_decision,
      'parent'::TEXT AS relationship,
      0 AS sort_order
    FROM public.visits AS parent
    WHERE parent.id = v_visit.parent_visit_id

    UNION ALL

    SELECT
      child.id AS id,
      child.visit_number,
      child.status,
      child.review_decision,
      'child'::TEXT AS relationship,
      1 AS sort_order
    FROM public.visits AS child
    WHERE child.parent_visit_id = p_visit_id
  ) AS rv;

  RETURN jsonb_build_object(
    'visit_id', v_visit.id,
    'visit_number', v_visit.visit_number,
    'branch_name', v_visit.store_name,
    'branch_id', v_visit.store_id,
    'visitor_id', v_visit.user_id,
    'visitor_name', v_visitor_name,
    'visit_date', v_visit.started_at,
    'submitted_at', v_visit.submitted_at,
    'status', v_visit.status,
    'review_notes', v_visit.review_notes,
    'review_decision', v_visit.review_decision,
    'reviewed_at', v_visit.reviewed_at,
    'reviewed_by_name', v_reviewer_name,
    'is_read_only', v_visit.status = 'Closed',
    'can_review', public.is_admin() AND v_visit.status IN ('Submitted', 'Reviewed'),
    'can_create_follow_up', (
      v_visit.review_decision = 'needs_follow_up'
      AND NOT EXISTS (
        SELECT 1
        FROM public.visits AS child
        WHERE child.parent_visit_id = p_visit_id
      )
    ),
    'parent_visit_id', v_visit.parent_visit_id,
    'general_notes', v_visit.general_notes,
    'pdf_report_reference', v_visit.visit_number,
    'performance', v_performance,
    'inspection_items', v_inspection_items,
    'photos', v_photos,
    'timeline', v_timeline,
    'related_visits', v_related_visits
  );
END;
$$;

COMMENT ON FUNCTION public.get_visit_details(UUID) IS
  'Returns full visit details including timeline, related visits, and review metadata.';
