-- =============================================================================
-- Immutable Branch Performance snapshots per visit
--
-- Historical visits previously joined sales_achievement via import_batch_id.
-- Daily snapshot imports replace sales_achievement rows, orphaning old visits.
-- This migration copies performance at submit time and reads from the snapshot.
-- =============================================================================

CREATE TABLE public.visit_performance_snapshots (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id            UUID           NOT NULL REFERENCES public.visits (id) ON DELETE CASCADE,
  brand               TEXT           NOT NULL,
  mtd_target          NUMERIC(14, 2) NOT NULL DEFAULT 0,
  actual_sales        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  achievement_percent NUMERIC(7, 2)  NOT NULL DEFAULT 0,
  import_batch_id     UUID           REFERENCES public.import_batches (id) ON DELETE SET NULL,
  captured_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT visit_performance_snapshots_brand_not_empty_check
    CHECK (char_length(trim(brand)) > 0),

  CONSTRAINT visit_performance_snapshots_visit_brand_unique
    UNIQUE (visit_id, brand)
);

CREATE INDEX idx_visit_performance_snapshots_visit_id
  ON public.visit_performance_snapshots (visit_id);

COMMENT ON TABLE public.visit_performance_snapshots IS
  'Immutable branch performance captured when a visit is submitted.';

COMMENT ON COLUMN public.visit_performance_snapshots.import_batch_id IS
  'Source import batch at capture time (audit metadata only; not used for reads).';

-- ---------------------------------------------------------------------------
-- Immutability: snapshots are write-once; cleanup allowed during visit delete.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_visit_performance_snapshot_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.allow_draft_cleanup', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Visit performance snapshots are immutable.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Visit performance snapshots are immutable.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER visit_performance_snapshots_immutable
  BEFORE UPDATE OR DELETE ON public.visit_performance_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_visit_performance_snapshot_mutation();

ALTER TABLE public.visit_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_visit_performance_snapshots
  ON public.visit_performance_snapshots FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY visitor_read_own_visit_performance_snapshots
  ON public.visit_performance_snapshots FOR SELECT TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
  );

-- ---------------------------------------------------------------------------
-- Capture helper (called from submit_visit_complete)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.capture_visit_performance_snapshot(
  p_visit_id        UUID,
  p_store_id        UUID,
  p_import_batch_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_visit_id IS NULL OR p_store_id IS NULL OR p_import_batch_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.visit_performance_snapshots (
    visit_id,
    brand,
    mtd_target,
    actual_sales,
    achievement_percent,
    import_batch_id
  )
  SELECT
    p_visit_id,
    sa.brand,
    sa.mtd_target,
    sa.actual_sales,
    sa.ach_percent,
    sa.import_batch_id
  FROM public.sales_achievement AS sa
  WHERE sa.store_id = p_store_id
    AND sa.import_batch_id = p_import_batch_id
  ON CONFLICT (visit_id, brand) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.capture_visit_performance_snapshot(UUID, UUID, UUID) IS
  'Copies current sales_achievement rows for a store/batch into immutable visit snapshots.';

REVOKE ALL ON FUNCTION public.capture_visit_performance_snapshot(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_visit_performance_snapshot(UUID, UUID, UUID) FROM authenticated;

-- ---------------------------------------------------------------------------
-- Backfill existing submitted visits where sales_achievement rows still exist.
-- Visits whose import_batch_id was superseded remain without performance data.
-- ---------------------------------------------------------------------------

INSERT INTO public.visit_performance_snapshots (
  visit_id,
  brand,
  mtd_target,
  actual_sales,
  achievement_percent,
  import_batch_id,
  captured_at
)
SELECT
  v.id,
  sa.brand,
  sa.mtd_target,
  sa.actual_sales,
  sa.ach_percent,
  sa.import_batch_id,
  COALESCE(v.submitted_at, v.updated_at, NOW())
FROM public.visits AS v
INNER JOIN public.sales_achievement AS sa
  ON sa.store_id = v.store_id
 AND sa.import_batch_id = v.import_batch_id
WHERE v.status <> 'Draft'
  AND v.store_id IS NOT NULL
  AND v.import_batch_id IS NOT NULL
ON CONFLICT (visit_id, brand) DO NOTHING;

-- ---------------------------------------------------------------------------
-- submit_visit_complete: capture performance before status becomes Submitted
-- ---------------------------------------------------------------------------

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
      store_id        = p_store_id,
      store_name      = trim(p_store_name),
      import_batch_id = p_import_batch_id,
      general_notes   = NULLIF(trim(p_general_notes), ''),
      started_at      = COALESCE(p_started_at, started_at),
      updated_at      = NOW()
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

  PERFORM public.capture_visit_performance_snapshot(
    v_visit_id,
    p_store_id,
    p_import_batch_id
  );

  UPDATE public.visits
  SET
    visit_number    = v_visit_number,
    import_batch_id = p_import_batch_id,
    status          = 'Submitted',
    submitted_at    = v_submitted_at,
    submitted_by    = auth.uid(),
    updated_at      = NOW()
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

-- ---------------------------------------------------------------------------
-- get_visit_details: read performance from snapshot, not sales_achievement
-- ---------------------------------------------------------------------------

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

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'brand', vps.brand,
        'mtd_target', vps.mtd_target,
        'actual_sales', vps.actual_sales,
        'achievement_percent', vps.achievement_percent
      )
      ORDER BY vps.brand
    ),
    '[]'::JSONB
  )
  INTO v_performance
  FROM public.visit_performance_snapshots AS vps
  WHERE vps.visit_id = p_visit_id;

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
    'can_delete', (
      public.is_admin()
      OR v_visit.user_id = auth.uid()
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

-- ---------------------------------------------------------------------------
-- delete_visit_cascade: remove snapshots during visit cleanup
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_visit_cascade(p_visit_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child_id UUID;
  v_child_result JSONB;
  v_paths JSONB := '[]'::JSONB;
  v_photo_paths JSONB;
BEGIN
  FOR v_child_id IN
    SELECT id
    FROM public.visits
    WHERE parent_visit_id = p_visit_id
    ORDER BY started_at
  LOOP
    v_child_result := public.delete_visit_cascade(v_child_id);
    v_paths := v_paths || COALESCE(v_child_result->'storage_paths', '[]'::JSONB);
  END LOOP;

  PERFORM set_config('app.allow_draft_cleanup', 'true', true);

  SELECT COALESCE(jsonb_agg(vp.storage_path), '[]'::JSONB)
  INTO v_photo_paths
  FROM public.visit_photos AS vp
  WHERE vp.visit_id = p_visit_id;

  v_paths := v_paths || COALESCE(v_photo_paths, '[]'::JSONB);

  DELETE FROM public.pdf_reports
  WHERE visit_id = p_visit_id;

  DELETE FROM public.visit_performance_snapshots
  WHERE visit_id = p_visit_id;

  DELETE FROM public.visit_photos
  WHERE visit_id = p_visit_id;

  DELETE FROM public.visit_observations
  WHERE visit_id = p_visit_id;

  DELETE FROM public.visits
  WHERE id = p_visit_id;

  RETURN jsonb_build_object('storage_paths', v_paths);
END;
$$;
