-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 4
-- Migration: Row Level Security (Version 1)
-- =============================================================================
--
-- Version 1 policy model:
--   Admin   → full access
--   Visitor → read application data, create/edit own Draft visits (autosave)
--             submitted visits are read-only
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_statuses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_display       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_achievement   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_observations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_photos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_reports         ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.visit_statuses      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.stores              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.store_display       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_achievement   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.visits              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.visit_observations  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.visit_photos        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_reports         FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- Admin — full access
-- =============================================================================

CREATE POLICY admin_all_profiles
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_all_visit_statuses
  ON public.visit_statuses FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_all_app_settings
  ON public.app_settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_all_import_batches
  ON public.import_batches FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_all_stores
  ON public.stores FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_all_store_display
  ON public.store_display FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_all_sales_achievement
  ON public.sales_achievement FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_all_visits
  ON public.visits FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_all_visit_observations
  ON public.visit_observations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_all_visit_photos
  ON public.visit_photos FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_all_pdf_reports
  ON public.pdf_reports FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================================================
-- Visitor — profiles
-- =============================================================================

CREATE POLICY visitor_select_own_profile
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_visitor() AND public.is_active_user() AND id = auth.uid());

CREATE POLICY visitor_update_own_profile
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_visitor() AND public.is_active_user() AND id = auth.uid())
  WITH CHECK (public.is_visitor() AND public.is_active_user() AND id = auth.uid());

-- =============================================================================
-- Visitor — read application data
-- =============================================================================

CREATE POLICY visitor_read_visit_statuses
  ON public.visit_statuses FOR SELECT TO authenticated
  USING (public.is_visitor() AND public.is_active_user() AND is_active = TRUE);

CREATE POLICY visitor_read_app_settings
  ON public.app_settings FOR SELECT TO authenticated
  USING (public.is_visitor() AND public.is_active_user());

CREATE POLICY visitor_read_stores
  ON public.stores FOR SELECT TO authenticated
  USING (public.is_visitor() AND public.is_active_user());

CREATE POLICY visitor_read_store_display
  ON public.store_display FOR SELECT TO authenticated
  USING (public.is_visitor() AND public.is_active_user());

CREATE POLICY visitor_read_sales_achievement
  ON public.sales_achievement FOR SELECT TO authenticated
  USING (public.is_visitor() AND public.is_active_user());

-- =============================================================================
-- Visitor — visits (Draft autosave + read submitted)
-- =============================================================================

CREATE POLICY visitor_select_own_visits
  ON public.visits FOR SELECT TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND user_id = auth.uid()
  );

CREATE POLICY visitor_insert_draft_visits
  ON public.visits FOR INSERT TO authenticated
  WITH CHECK (
    public.is_visitor()
    AND public.is_active_user()
    AND user_id = auth.uid()
    AND status = 'Draft'
    AND store_name IS NOT NULL
    AND char_length(trim(store_name)) > 0
  );

CREATE POLICY visitor_update_own_draft_visits
  ON public.visits FOR UPDATE TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND user_id = auth.uid()
    AND status = 'Draft'
  )
  WITH CHECK (
    public.is_visitor()
    AND public.is_active_user()
    AND user_id = auth.uid()
    AND status = 'Draft'
  );

-- =============================================================================
-- Visitor — observations (Draft autosave only)
-- =============================================================================

CREATE POLICY visitor_select_own_observations
  ON public.visit_observations FOR SELECT TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
  );

CREATE POLICY visitor_insert_draft_observations
  ON public.visit_observations FOR INSERT TO authenticated
  WITH CHECK (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
    AND public.is_draft_visit(visit_id)
  );

CREATE POLICY visitor_update_draft_observations
  ON public.visit_observations FOR UPDATE TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
    AND public.is_draft_visit(visit_id)
  )
  WITH CHECK (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
    AND public.is_draft_visit(visit_id)
  );

-- =============================================================================
-- Visitor — photos (Draft insert only, read submitted)
-- =============================================================================

CREATE POLICY visitor_select_own_photos
  ON public.visit_photos FOR SELECT TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
  );

CREATE POLICY visitor_insert_draft_photos
  ON public.visit_photos FOR INSERT TO authenticated
  WITH CHECK (
    public.is_visitor()
    AND public.is_active_user()
    AND uploaded_by = auth.uid()
    AND public.owns_visit(visit_id)
    AND public.is_draft_visit(visit_id)
  );

-- =============================================================================
-- Visitor — PDF reports (read own submitted visits)
-- PDF creation uses create_visit_pdf_report() helper (SECURITY DEFINER)
-- =============================================================================

CREATE POLICY visitor_select_own_pdf_reports
  ON public.pdf_reports FOR SELECT TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
  );

-- =============================================================================
-- Grants
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;
