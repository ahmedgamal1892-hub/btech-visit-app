-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 4
-- Migration: Seed data
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Observation statuses
-- -----------------------------------------------------------------------------

INSERT INTO public.visit_statuses (code, label, sort_order, is_active)
VALUES
  ('saleable', 'Sellable', 1, TRUE),
  ('display',  'Display',  2, TRUE),
  ('delisted', 'Delisted', 3, TRUE),
  ('dead',     'Dead',     4, TRUE),
  ('damaged',  'Damaged',  5, TRUE)
ON CONFLICT (code) DO UPDATE
SET
  label      = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  is_active  = EXCLUDED.is_active,
  updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Default application settings
-- -----------------------------------------------------------------------------

INSERT INTO public.app_settings (key, value, description)
VALUES
  (
    'app.name',
    '"Visit APP By Gimi"'::JSONB,
    'Application display name.'
  ),
  (
    'app.tagline',
    '"Store Visit Management System for B.TECH"'::JSONB,
    'Application tagline shown in the UI.'
  ),
  (
    'visit.default_status',
    '"Draft"'::JSONB,
    'Default status assigned when a new visit is created.'
  ),
  (
    'visit.autosave_enabled',
    'true'::JSONB,
    'Enables autosave while a visit remains in Draft status.'
  ),
  (
    'visit.max_photos_per_visit',
    '20'::JSONB,
    'Maximum number of photos allowed per visit.'
  ),
  (
    'visit.max_observations_per_visit',
    '500'::JSONB,
    'Maximum number of observations allowed per visit.'
  ),
  (
    'visit.require_store_on_submit',
    'true'::JSONB,
    'Require a selected store before visit submission.'
  ),
  (
    'visit.require_observations_on_submit',
    'true'::JSONB,
    'Require at least one observation before visit submission.'
  ),
  (
    'visit.require_status_on_observations',
    'true'::JSONB,
    'Require every observation to have a status before submission.'
  ),
  (
    'import.allowed_extensions',
    '["xlsx", "xls"]'::JSONB,
    'Allowed Excel file extensions for daily import.'
  ),
  (
    'import.max_file_size_mb',
    '10'::JSONB,
    'Maximum Excel import file size in megabytes.'
  ),
  (
    'import.replace_snapshot_on_confirm',
    'true'::JSONB,
    'Replace operational snapshot tables on confirmed import.'
  ),
  (
    'storage.visit_photos_bucket',
    '"visit-photos"'::JSONB,
    'Supabase Storage bucket for visit photos.'
  ),
  (
    'storage.max_photo_size_mb',
    '5'::JSONB,
    'Maximum photo upload size in megabytes.'
  ),
  (
    'reports.pdf_after_submission_only',
    'true'::JSONB,
    'Allow PDF generation only after a visit is submitted.'
  ),
  (
    'auth.default_role',
    '"Visitor"'::JSONB,
    'Default role assigned to newly registered users.'
  )
ON CONFLICT (key) DO UPDATE
SET
  value       = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at  = NOW();
