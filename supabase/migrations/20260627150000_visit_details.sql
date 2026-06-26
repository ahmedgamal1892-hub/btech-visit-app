-- Full visit details payload for the Visit Details page.

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
    'general_notes', v_visit.general_notes,
    'pdf_report_reference', v_visit.visit_number,
    'performance', v_performance,
    'inspection_items', v_inspection_items,
    'photos', v_photos
  );
END;
$$;

COMMENT ON FUNCTION public.get_visit_details(UUID) IS
  'Returns full visit details including performance, inspection items, and photos.';

GRANT EXECUTE ON FUNCTION public.get_visit_details(UUID) TO authenticated;
