-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 2
-- Migration: Snapshot schema — import_batches, stores, store_display,
--            sales_achievement
-- =============================================================================

-- -----------------------------------------------------------------------------
-- import_batches
-- Audit trail for daily Excel imports. Append-only — never hard-deleted.
-- -----------------------------------------------------------------------------

CREATE TABLE public.import_batches (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by         UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  file_name           TEXT        NOT NULL,
  storage_path        TEXT,
  status              TEXT        NOT NULL DEFAULT 'confirmed',
  is_current          BOOLEAN     NOT NULL DEFAULT FALSE,
  display_row_count   INTEGER,
  ach_row_count       INTEGER,
  display_hash        TEXT,
  ach_hash            TEXT,
  validation_report   JSONB,
  validation_errors   JSONB       NOT NULL DEFAULT '[]'::JSONB,
  error_log           JSONB,
  confirmed_at        TIMESTAMPTZ,
  superseded_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT import_batches_file_name_not_empty_check
    CHECK (char_length(trim(file_name)) > 0),

  CONSTRAINT import_batches_status_check
    CHECK (status IN ('confirmed', 'superseded', 'failed')),

  CONSTRAINT import_batches_display_row_count_check
    CHECK (display_row_count IS NULL OR display_row_count >= 0),

  CONSTRAINT import_batches_ach_row_count_check
    CHECK (ach_row_count IS NULL OR ach_row_count >= 0),

  CONSTRAINT import_batches_validation_errors_is_array_check
    CHECK (jsonb_typeof(validation_errors) = 'array'),

  CONSTRAINT import_batches_display_hash_format_check
    CHECK (display_hash IS NULL OR char_length(trim(display_hash)) >= 8),

  CONSTRAINT import_batches_ach_hash_format_check
    CHECK (ach_hash IS NULL OR char_length(trim(ach_hash)) >= 8)
);

CREATE UNIQUE INDEX uq_import_batches_one_current
  ON public.import_batches (is_current)
  WHERE is_current = TRUE;

CREATE INDEX idx_import_batches_uploaded_by
  ON public.import_batches (uploaded_by);

CREATE INDEX idx_import_batches_status
  ON public.import_batches (status);

CREATE INDEX idx_import_batches_created_at
  ON public.import_batches (created_at DESC);

CREATE INDEX idx_import_batches_display_hash
  ON public.import_batches (display_hash);

CREATE INDEX idx_import_batches_ach_hash
  ON public.import_batches (ach_hash);

CREATE TRIGGER set_import_batches_updated_at
  BEFORE UPDATE ON public.import_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.import_batches IS
  'Upload history for confirmed and failed Excel imports. Not used for preview staging.';
COMMENT ON COLUMN public.import_batches.display_hash IS
  'Content hash of the parsed Display worksheet payload.';
COMMENT ON COLUMN public.import_batches.ach_hash IS
  'Content hash of the parsed ACH worksheet payload.';
COMMENT ON COLUMN public.import_batches.validation_errors IS
  'Empty on successful imports. Populated only when logging a failed import attempt.';
COMMENT ON COLUMN public.import_batches.validation_report IS
  'In-memory validation summary persisted after a successful confirmed import.';

-- -----------------------------------------------------------------------------
-- stores
-- Replaced on every confirmed import. Scoped to a single batch.
-- -----------------------------------------------------------------------------

CREATE TABLE public.stores (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID        NOT NULL REFERENCES public.import_batches (id) ON DELETE RESTRICT,
  name            TEXT        NOT NULL,
  budget_channel  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT stores_name_not_empty_check
    CHECK (char_length(trim(name)) > 0),

  CONSTRAINT stores_budget_channel_not_empty_check
    CHECK (budget_channel IS NULL OR char_length(trim(budget_channel)) > 0)
);

CREATE UNIQUE INDEX uq_stores_batch_name
  ON public.stores (batch_id, name);

CREATE INDEX idx_stores_batch_id
  ON public.stores (batch_id);

CREATE INDEX idx_stores_name
  ON public.stores (name);

CREATE INDEX idx_stores_budget_channel
  ON public.stores (budget_channel);

CREATE TRIGGER set_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.stores IS
  'Operational store snapshot. Fully replaced on each confirmed import.';
COMMENT ON COLUMN public.stores.batch_id IS
  'References the import_batches row that owns this store snapshot.';
COMMENT ON COLUMN public.stores.budget_channel IS
  'Budget channel associated with the store in the current Excel snapshot.';

-- -----------------------------------------------------------------------------
-- store_display
-- Display worksheet rows. Replaced on every confirmed import.
-- -----------------------------------------------------------------------------

CREATE TABLE public.store_display (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id  UUID        NOT NULL REFERENCES public.import_batches (id) ON DELETE RESTRICT,
  store_id         UUID        NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  brand            TEXT        NOT NULL,
  sub_category     TEXT        NOT NULL,
  item_code        TEXT        NOT NULL,
  product_name     TEXT        NOT NULL,
  display_qty      INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT store_display_brand_not_empty_check
    CHECK (char_length(trim(brand)) > 0),

  CONSTRAINT store_display_sub_category_not_empty_check
    CHECK (char_length(trim(sub_category)) > 0),

  CONSTRAINT store_display_item_code_not_empty_check
    CHECK (char_length(trim(item_code)) > 0),

  CONSTRAINT store_display_product_name_not_empty_check
    CHECK (char_length(trim(product_name)) > 0),

  CONSTRAINT store_display_display_qty_check
    CHECK (display_qty >= 0)
);

CREATE UNIQUE INDEX uq_store_display_batch_store_item
  ON public.store_display (import_batch_id, store_id, item_code);

CREATE INDEX idx_store_display_import_batch_id
  ON public.store_display (import_batch_id);

CREATE INDEX idx_store_display_store_id
  ON public.store_display (store_id);

CREATE INDEX idx_store_display_item_code
  ON public.store_display (item_code);

CREATE TRIGGER set_store_display_updated_at
  BEFORE UPDATE ON public.store_display
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.store_display IS
  'Display sheet snapshot rows. Fully replaced on each confirmed import.';

-- -----------------------------------------------------------------------------
-- sales_achievement
-- ACH worksheet rows. Replaced on every confirmed import.
-- -----------------------------------------------------------------------------

CREATE TABLE public.sales_achievement (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id  UUID           NOT NULL REFERENCES public.import_batches (id) ON DELETE RESTRICT,
  store_id         UUID           NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  brand            TEXT           NOT NULL,
  mtd_target       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  actual_sales     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ach_percent      NUMERIC(7, 2)  NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT sales_achievement_brand_not_empty_check
    CHECK (char_length(trim(brand)) > 0),

  CONSTRAINT sales_achievement_mtd_target_check
    CHECK (mtd_target >= 0),

  CONSTRAINT sales_achievement_actual_sales_check
    CHECK (actual_sales >= 0)
);

CREATE UNIQUE INDEX uq_sales_achievement_batch_store_brand
  ON public.sales_achievement (import_batch_id, store_id, brand);

CREATE INDEX idx_sales_achievement_import_batch_id
  ON public.sales_achievement (import_batch_id);

CREATE INDEX idx_sales_achievement_store_id
  ON public.sales_achievement (store_id);

CREATE INDEX idx_sales_achievement_brand
  ON public.sales_achievement (brand);

CREATE INDEX idx_sales_achievement_store_brand
  ON public.sales_achievement (store_id, brand);

CREATE TRIGGER set_sales_achievement_updated_at
  BEFORE UPDATE ON public.sales_achievement
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.sales_achievement IS
  'ACH sheet snapshot rows. Fully replaced on each confirmed import.';

-- -----------------------------------------------------------------------------
-- Enforce store/batch alignment on snapshot child rows
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_snapshot_store_batch_alignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_store_batch_id UUID;
BEGIN
  SELECT batch_id
  INTO v_store_batch_id
  FROM public.stores
  WHERE id = NEW.store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store % does not exist.', NEW.store_id;
  END IF;

  IF TG_TABLE_NAME = 'store_display' THEN
    IF v_store_batch_id IS DISTINCT FROM NEW.import_batch_id THEN
      RAISE EXCEPTION
        'store_display.store_id % belongs to batch %, not import_batch_id %.',
        NEW.store_id,
        v_store_batch_id,
        NEW.import_batch_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'sales_achievement' THEN
    IF v_store_batch_id IS DISTINCT FROM NEW.import_batch_id THEN
      RAISE EXCEPTION
        'sales_achievement.store_id % belongs to batch %, not import_batch_id %.',
        NEW.store_id,
        v_store_batch_id,
        NEW.import_batch_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_store_display_batch_alignment
  BEFORE INSERT OR UPDATE ON public.store_display
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_snapshot_store_batch_alignment();

CREATE TRIGGER enforce_sales_achievement_batch_alignment
  BEFORE INSERT OR UPDATE ON public.sales_achievement
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_snapshot_store_batch_alignment();
