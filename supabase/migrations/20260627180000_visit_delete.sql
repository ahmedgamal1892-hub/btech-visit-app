-- =============================================================================
-- Visit deletion with role-based permissions
-- Admin: any visit. Visitor: own visits only (including owned follow-up tree).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_submitted_pdf_report_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.allow_draft_cleanup', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PDF reports are never deleted.';
  END IF;

  RETURN NEW;
END;
$$;

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

  DELETE FROM public.visit_photos
  WHERE visit_id = p_visit_id;

  DELETE FROM public.visit_observations
  WHERE visit_id = p_visit_id;

  DELETE FROM public.visits
  WHERE id = p_visit_id;

  RETURN jsonb_build_object('storage_paths', v_paths);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_visit(p_visit_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit public.visits;
  v_cascade_result JSONB;
  v_storage_paths JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF p_visit_id IS NULL THEN
    RAISE EXCEPTION 'Visit id is required.';
  END IF;

  SELECT *
  INTO v_visit
  FROM public.visits
  WHERE id = p_visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', p_visit_id;
  END IF;

  IF NOT public.is_admin() AND v_visit.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You are not authorized to delete this visit.';
  END IF;

  IF NOT public.is_admin() AND EXISTS (
    WITH RECURSIVE descendants AS (
      SELECT child.id, child.user_id
      FROM public.visits AS child
      WHERE child.parent_visit_id = p_visit_id

      UNION ALL

      SELECT nested.id, nested.user_id
      FROM public.visits AS nested
      INNER JOIN descendants AS d ON nested.parent_visit_id = d.id
    )
    SELECT 1
    FROM descendants
    WHERE user_id IS DISTINCT FROM auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not authorized to delete related follow-up visits.';
  END IF;

  v_cascade_result := public.delete_visit_cascade(p_visit_id);
  v_storage_paths := COALESCE(v_cascade_result->'storage_paths', '[]'::JSONB);

  RETURN jsonb_build_object(
    'visit_id', p_visit_id,
    'storage_paths', v_storage_paths
  );
END;
$$;

COMMENT ON FUNCTION public.delete_visit(UUID) IS
  'Permanently deletes a visit and related rows. Admin may delete any visit; visitors may delete only their own visits and owned follow-up trees.';

COMMENT ON FUNCTION public.delete_visit_cascade(UUID) IS
  'Internal helper that recursively deletes a visit subtree and returns storage paths for client cleanup.';

GRANT EXECUTE ON FUNCTION public.delete_visit(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_visit_cascade(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_visit_cascade(UUID) FROM authenticated;

CREATE POLICY visitor_delete_own_visits
  ON public.visits FOR DELETE TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND user_id = auth.uid()
  );

CREATE POLICY visitor_delete_own_observations
  ON public.visit_observations FOR DELETE TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
  );

CREATE POLICY visitor_delete_own_photos
  ON public.visit_photos FOR DELETE TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
  );

CREATE POLICY visitor_delete_own_pdf_reports
  ON public.pdf_reports FOR DELETE TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
  );

CREATE POLICY visit_photos_storage_visitor_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'visit-photos'
    AND public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit((storage.foldername(name))[1]::UUID)
  );

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
