-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 4
-- Migration: Private storage bucket for visit photos
-- =============================================================================

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'visit-photos',
  'visit-photos',
  FALSE,
  5242880,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- Admin storage access
-- =============================================================================

CREATE POLICY visit_photos_storage_admin_all
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'visit-photos'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'visit-photos'
    AND public.is_admin()
  );

-- =============================================================================
-- Visitor storage access
-- Path convention: {visit_id}/{filename}
-- Draft visits only for uploads; submitted visits are read-only
-- =============================================================================

CREATE POLICY visit_photos_storage_visitor_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'visit-photos'
    AND public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY visit_photos_storage_visitor_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'visit-photos'
    AND public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit((storage.foldername(name))[1]::UUID)
    AND public.is_draft_visit((storage.foldername(name))[1]::UUID)
  );

-- No DELETE policies: visit photos are never deleted from storage.
