-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 3
-- Migration: Historical visit schema
-- =============================================================================

-- -----------------------------------------------------------------------------
-- visits
-- Immutable after submission. Never hard-deleted.
-- -----------------------------------------------------------------------------

CREATE TABLE public.visits (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  import_batch_id  UUID        REFERENCES public.import_batches (id) ON DELETE SET NULL,
  store_name       TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'Draft',
  general_notes    TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at     TIMESTAMPTZ,
  submitted_by     UUID        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT visits_status_check
    CHECK (status IN ('Draft', 'Submitted')),

  CONSTRAINT visits_store_name_not_empty_check
    CHECK (char_length(trim(store_name)) > 0),

  CONSTRAINT visits_submitted_fields_check
    CHECK (
      (
        status = 'Draft'
        AND submitted_at IS NULL
        AND submitted_by IS NULL
      )
      OR (
        status = 'Submitted'
        AND submitted_at IS NOT NULL
        AND submitted_by IS NOT NULL
      )
    ),

  CONSTRAINT visits_submitted_after_started_check
    CHECK (
      submitted_at IS NULL
      OR submitted_at >= started_at
    )
);

CREATE INDEX idx_visits_user_started_at
  ON public.visits (user_id, started_at DESC);

CREATE INDEX idx_visits_store_name_started_at
  ON public.visits (store_name, started_at DESC);

CREATE INDEX idx_visits_status
  ON public.visits (status);

CREATE INDEX idx_visits_import_batch_id
  ON public.visits (import_batch_id);

CREATE INDEX idx_visits_submitted_at
  ON public.visits (submitted_at DESC);

CREATE INDEX idx_visits_submitted_by
  ON public.visits (submitted_by);

CREATE TRIGGER set_visits_updated_at
  BEFORE UPDATE ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.visits IS
  'Store visit records. Immutable after submission.';
COMMENT ON COLUMN public.visits.store_name IS
  'Store name copied from the operational snapshot when the visit is created.';
COMMENT ON COLUMN public.visits.started_at IS
  'Timestamp when the visit was started.';
COMMENT ON COLUMN public.visits.submitted_at IS
  'Timestamp when the visit was submitted.';
COMMENT ON COLUMN public.visits.import_batch_id IS
  'Import batch active when the visit was started. Audit reference only.';

-- -----------------------------------------------------------------------------
-- visit_observations
-- Denormalized historical product snapshots. Immutable after visit submission.
-- -----------------------------------------------------------------------------

CREATE TABLE public.visit_observations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id          UUID        NOT NULL REFERENCES public.visits (id) ON DELETE RESTRICT,
  visit_status_id   UUID        NOT NULL REFERENCES public.visit_statuses (id) ON DELETE RESTRICT,
  store_name        TEXT        NOT NULL,
  brand             TEXT        NOT NULL,
  sub_category      TEXT        NOT NULL,
  item_code         TEXT        NOT NULL,
  product_name      TEXT        NOT NULL,
  display_qty       INTEGER     NOT NULL DEFAULT 0,
  notes             TEXT,
  display_order     INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT visit_observations_store_name_not_empty_check
    CHECK (char_length(trim(store_name)) > 0),

  CONSTRAINT visit_observations_brand_not_empty_check
    CHECK (char_length(trim(brand)) > 0),

  CONSTRAINT visit_observations_sub_category_not_empty_check
    CHECK (char_length(trim(sub_category)) > 0),

  CONSTRAINT visit_observations_item_code_not_empty_check
    CHECK (char_length(trim(item_code)) > 0),

  CONSTRAINT visit_observations_product_name_not_empty_check
    CHECK (char_length(trim(product_name)) > 0),

  CONSTRAINT visit_observations_display_qty_check
    CHECK (display_qty >= 0),

  CONSTRAINT visit_observations_display_order_check
    CHECK (display_order >= 0)
);

CREATE UNIQUE INDEX uq_visit_observations_visit_item_code
  ON public.visit_observations (visit_id, item_code);

CREATE INDEX idx_visit_observations_visit_id
  ON public.visit_observations (visit_id);

CREATE INDEX idx_visit_observations_visit_status_id
  ON public.visit_observations (visit_status_id);

CREATE INDEX idx_visit_observations_visit_display_order
  ON public.visit_observations (visit_id, display_order);

CREATE INDEX idx_visit_observations_item_code
  ON public.visit_observations (item_code);

CREATE TRIGGER set_visit_observations_updated_at
  BEFORE UPDATE ON public.visit_observations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.visit_observations IS
  'Copied Display sheet values captured during a visit. Never references live snapshot rows.';
COMMENT ON COLUMN public.visit_observations.display_order IS
  'Display ordering of observations within a visit.';

-- -----------------------------------------------------------------------------
-- visit_photos
-- Immutable after visit submission. Never hard-deleted.
-- -----------------------------------------------------------------------------

CREATE TABLE public.visit_photos (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id              UUID        NOT NULL REFERENCES public.visits (id) ON DELETE RESTRICT,
  visit_observation_id  UUID        REFERENCES public.visit_observations (id) ON DELETE SET NULL,
  uploaded_by           UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  storage_path          TEXT        NOT NULL,
  file_name             TEXT        NOT NULL,
  photo_type            TEXT        NOT NULL DEFAULT 'General',
  mime_type             TEXT,
  file_size_bytes       BIGINT,
  caption               TEXT,
  sort_order            INTEGER     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT visit_photos_storage_path_not_empty_check
    CHECK (char_length(trim(storage_path)) > 0),

  CONSTRAINT visit_photos_file_name_not_empty_check
    CHECK (char_length(trim(file_name)) > 0),

  CONSTRAINT visit_photos_photo_type_check
    CHECK (photo_type IN (
      'General',
      'Product',
      'Display',
      'Shelf',
      'Other'
    )),

  CONSTRAINT visit_photos_sort_order_check
    CHECK (sort_order >= 0),

  CONSTRAINT visit_photos_file_size_bytes_check
    CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)
);

CREATE INDEX idx_visit_photos_visit_sort
  ON public.visit_photos (visit_id, sort_order);

CREATE INDEX idx_visit_photos_visit_observation_id
  ON public.visit_photos (visit_observation_id);

CREATE INDEX idx_visit_photos_uploaded_by
  ON public.visit_photos (uploaded_by);

CREATE INDEX idx_visit_photos_photo_type
  ON public.visit_photos (photo_type);

CREATE TRIGGER set_visit_photos_updated_at
  BEFORE UPDATE ON public.visit_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.visit_photos IS
  'Photo attachments for visits. Never hard-deleted.';
COMMENT ON COLUMN public.visit_photos.visit_observation_id IS
  'Optional link to the observation this photo documents.';

-- -----------------------------------------------------------------------------
-- pdf_reports
-- Generated only after successful visit submission. Never hard-deleted.
-- -----------------------------------------------------------------------------

CREATE TABLE public.pdf_reports (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id         UUID        NOT NULL REFERENCES public.visits (id) ON DELETE RESTRICT,
  generated_by     UUID        REFERENCES public.profiles (id) ON DELETE SET NULL,
  storage_path     TEXT        NOT NULL,
  file_name        TEXT        NOT NULL,
  file_size_bytes  BIGINT,
  version          INTEGER     NOT NULL DEFAULT 1,
  is_current       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pdf_reports_storage_path_not_empty_check
    CHECK (char_length(trim(storage_path)) > 0),

  CONSTRAINT pdf_reports_file_name_not_empty_check
    CHECK (char_length(trim(file_name)) > 0),

  CONSTRAINT pdf_reports_version_check
    CHECK (version >= 1),

  CONSTRAINT pdf_reports_file_size_bytes_check
    CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)
);

CREATE INDEX idx_pdf_reports_visit_current
  ON public.pdf_reports (visit_id, is_current);

CREATE INDEX idx_pdf_reports_generated_by
  ON public.pdf_reports (generated_by);

CREATE UNIQUE INDEX uq_pdf_reports_visit_current
  ON public.pdf_reports (visit_id)
  WHERE is_current = TRUE;

CREATE TRIGGER set_pdf_reports_updated_at
  BEFORE UPDATE ON public.pdf_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.pdf_reports IS
  'Generated PDF reports for submitted visits. Supports versioning.';

-- -----------------------------------------------------------------------------
-- Align optional photo -> observation references within the same visit
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_visit_photo_observation_alignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_observation_visit_id UUID;
BEGIN
  IF NEW.visit_observation_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT visit_id
  INTO v_observation_visit_id
  FROM public.visit_observations
  WHERE id = NEW.visit_observation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Observation % was not found.',
      NEW.visit_observation_id;
  END IF;

  IF v_observation_visit_id IS DISTINCT FROM NEW.visit_id THEN
    RAISE EXCEPTION
      'Photo visit_id % does not match observation visit_id %.',
      NEW.visit_id,
      v_observation_visit_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_visit_photo_observation_alignment
  BEFORE INSERT OR UPDATE ON public.visit_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_visit_photo_observation_alignment();
