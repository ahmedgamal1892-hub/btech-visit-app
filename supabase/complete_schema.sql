-- =============================================================================
-- Visit APP By Gimi — Complete Database Schema
-- =============================================================================
-- Run this script ONCE in the Supabase SQL Editor on an empty project.
--
-- Merged from all migrations in dependency order:
--   20250627100000_extensions_and_functions.sql
--   20250627100100_static_schema.sql
--   20250627100200_snapshot_schema.sql
--   20250627100300_snapshot_atomic_replace.sql
--   20250627100400_visit_schema.sql
--   20250627100500_visit_submission_rules.sql
--   20250627100600_auth_and_submit_validation.sql
--   20250627100700_rls_policies.sql
--   20250627100800_seed_data.sql
--   20250627100900_storage_bucket.sql
--   20250627101000_auth_user_profile_trigger.sql
--
-- Idempotent patterns used where possible:
--   CREATE EXTENSION IF NOT EXISTS
--   CREATE TABLE IF NOT EXISTS
--   CREATE [UNIQUE] INDEX IF NOT EXISTS
--   CREATE OR REPLACE FUNCTION
--   DROP TRIGGER / DROP POLICY IF EXISTS before CREATE
--   INSERT ... ON CONFLICT for seed data and storage bucket
-- =============================================================================


-- =============================================================================
-- SOURCE: 20250627100000_extensions_and_functions.sql
-- =============================================================================

-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 1
-- Migration: PostgreSQL extensions and shared helper functions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Automatically maintain updated_at on row updates
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_updated_at() IS
  'Sets updated_at to NOW() before any row update.';


-- =============================================================================
-- SOURCE: 20250627100100_static_schema.sql
-- =============================================================================

-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 1
-- Migration: Static schema — profiles, visit_statuses, app_settings
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- Linked 1:1 with auth.users. Passwords are never stored here.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  username    TEXT        NOT NULL,
  role        TEXT        NOT NULL,
  phone       TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_role_check
    CHECK (role IN ('Admin', 'Visitor')),

  CONSTRAINT profiles_username_length_check
    CHECK (char_length(trim(username)) >= 3),

  CONSTRAINT profiles_phone_format_check
    CHECK (phone IS NULL OR char_length(trim(phone)) >= 7)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_username
  ON public.profiles (username);

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role);

CREATE INDEX IF NOT EXISTS idx_profiles_is_active
  ON public.profiles (is_active);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.profiles IS
  'Application user profiles. One row per Supabase Auth user.';
COMMENT ON COLUMN public.profiles.id IS
  'Same UUID as auth.users.id.';
COMMENT ON COLUMN public.profiles.role IS
  'Application role: Admin or Visitor.';
COMMENT ON COLUMN public.profiles.phone IS
  'Optional contact phone number.';

-- -----------------------------------------------------------------------------
-- visit_statuses
-- Lookup table for product observation statuses during visits.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.visit_statuses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL,
  label       TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT visit_statuses_code_not_empty_check
    CHECK (char_length(trim(code)) > 0),

  CONSTRAINT visit_statuses_label_not_empty_check
    CHECK (char_length(trim(label)) > 0),

  CONSTRAINT visit_statuses_sort_order_check
    CHECK (sort_order >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_visit_statuses_code
  ON public.visit_statuses (code);

CREATE INDEX IF NOT EXISTS idx_visit_statuses_is_active
  ON public.visit_statuses (is_active);

CREATE INDEX IF NOT EXISTS idx_visit_statuses_sort_order
  ON public.visit_statuses (sort_order);

DROP TRIGGER IF EXISTS set_visit_statuses_updated_at ON public.visit_statuses;

CREATE TRIGGER set_visit_statuses_updated_at
  BEFORE UPDATE ON public.visit_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.visit_statuses IS
  'Observation status lookup: Sellable, Display, Delisted, Dead, Damaged.';

-- -----------------------------------------------------------------------------
-- app_settings
-- Application configuration key-value store.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_settings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT        NOT NULL,
  value        JSONB       NOT NULL DEFAULT '{}'::JSONB,
  description  TEXT,
  updated_by   UUID        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT app_settings_key_not_empty_check
    CHECK (char_length(trim(key)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_app_settings_key
  ON public.app_settings (key);

CREATE INDEX IF NOT EXISTS idx_app_settings_updated_by
  ON public.app_settings (updated_by);

DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;

CREATE TRIGGER set_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.app_settings IS
  'Global application settings stored as JSONB values.';
COMMENT ON COLUMN public.app_settings.key IS
  'Unique dot-notation setting identifier, e.g. app.name.';

-- -----------------------------------------------------------------------------
-- Helper functions (require profiles table)
-- Used by RLS policies in a later migration package.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'Admin'
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_visitor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'Visitor'
      AND is_active = TRUE
  );
$$;

COMMENT ON FUNCTION public.is_active_user() IS
  'Returns TRUE when the authenticated user has an active profile.';
COMMENT ON FUNCTION public.get_user_role() IS
  'Returns Admin or Visitor for the authenticated user.';
COMMENT ON FUNCTION public.is_admin() IS
  'Returns TRUE when the authenticated user is an active Admin.';
COMMENT ON FUNCTION public.is_visitor() IS
  'Returns TRUE when the authenticated user is an active Visitor.';


-- =============================================================================
-- SOURCE: 20250627100200_snapshot_schema.sql
-- =============================================================================

-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 2
-- Migration: Snapshot schema — import_batches, stores, store_display,
--            sales_achievement
-- =============================================================================

-- -----------------------------------------------------------------------------
-- import_batches
-- Audit trail for daily Excel imports. Append-only — never hard-deleted.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.import_batches (
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_import_batches_one_current
  ON public.import_batches (is_current)
  WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_import_batches_uploaded_by
  ON public.import_batches (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_import_batches_status
  ON public.import_batches (status);

CREATE INDEX IF NOT EXISTS idx_import_batches_created_at
  ON public.import_batches (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_batches_display_hash
  ON public.import_batches (display_hash);

CREATE INDEX IF NOT EXISTS idx_import_batches_ach_hash
  ON public.import_batches (ach_hash);

DROP TRIGGER IF EXISTS set_import_batches_updated_at ON public.import_batches;

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

CREATE TABLE IF NOT EXISTS public.stores (
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_stores_batch_name
  ON public.stores (batch_id, name);

CREATE INDEX IF NOT EXISTS idx_stores_batch_id
  ON public.stores (batch_id);

CREATE INDEX IF NOT EXISTS idx_stores_name
  ON public.stores (name);

CREATE INDEX IF NOT EXISTS idx_stores_budget_channel
  ON public.stores (budget_channel);

DROP TRIGGER IF EXISTS set_stores_updated_at ON public.stores;

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

CREATE TABLE IF NOT EXISTS public.store_display (
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_store_display_batch_store_item
  ON public.store_display (import_batch_id, store_id, item_code);

CREATE INDEX IF NOT EXISTS idx_store_display_import_batch_id
  ON public.store_display (import_batch_id);

CREATE INDEX IF NOT EXISTS idx_store_display_store_id
  ON public.store_display (store_id);

CREATE INDEX IF NOT EXISTS idx_store_display_item_code
  ON public.store_display (item_code);

DROP TRIGGER IF EXISTS set_store_display_updated_at ON public.store_display;

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

CREATE TABLE IF NOT EXISTS public.sales_achievement (
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_achievement_batch_store_brand
  ON public.sales_achievement (import_batch_id, store_id, brand);

CREATE INDEX IF NOT EXISTS idx_sales_achievement_import_batch_id
  ON public.sales_achievement (import_batch_id);

CREATE INDEX IF NOT EXISTS idx_sales_achievement_store_id
  ON public.sales_achievement (store_id);

CREATE INDEX IF NOT EXISTS idx_sales_achievement_brand
  ON public.sales_achievement (brand);

CREATE INDEX IF NOT EXISTS idx_sales_achievement_store_brand
  ON public.sales_achievement (store_id, brand);

DROP TRIGGER IF EXISTS set_sales_achievement_updated_at ON public.sales_achievement;

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

DROP TRIGGER IF EXISTS enforce_store_display_batch_alignment ON public.store_display;

CREATE TRIGGER enforce_store_display_batch_alignment
  BEFORE INSERT OR UPDATE ON public.store_display
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_snapshot_store_batch_alignment();

DROP TRIGGER IF EXISTS enforce_sales_achievement_batch_alignment ON public.sales_achievement;

CREATE TRIGGER enforce_sales_achievement_batch_alignment
  BEFORE INSERT OR UPDATE ON public.sales_achievement
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_snapshot_store_batch_alignment();


-- =============================================================================
-- SOURCE: 20250627100300_snapshot_atomic_replace.sql
-- =============================================================================

-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 2
-- Migration: Atomic operational snapshot replacement (confirm-time only)
-- =============================================================================
--
-- Application workflow — no preview persistence:
--   1. Read Excel in memory.
--   2. Validate in memory.
--   3. Show Import Summary to Admin.
--   4. Wait for confirmation.
--   5. Call confirm_snapshot_import(...) — single DB transaction:
--        a. Supersede current batch
--        b. DELETE all snapshot rows
--        c. INSERT import_batches history row
--        d. INSERT stores, store_display, sales_achievement
--   6. COMMIT on success / ROLLBACK on any error
--   7. Log failed attempts separately via log_failed_import(...)
--
-- JSON payload shapes:
--   p_stores:            [{ "name": "...", "budget_channel": "..." }]
--   p_store_display:     [{ "store_name": "...", "brand": "...",
--                           "sub_category": "...", "item_code": "...",
--                           "product_name": "...", "display_qty": 0 }]
--   p_sales_achievement: [{ "store_name": "...", "brand": "...",
--                           "mtd_target": 0, "actual_sales": 0,
--                           "ach_percent": 0 }]
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirm_snapshot_import(
  p_uploaded_by         UUID,
  p_file_name           TEXT,
  p_storage_path        TEXT,
  p_display_hash        TEXT,
  p_ach_hash            TEXT,
  p_validation_report   JSONB,
  p_stores              JSONB,
  p_store_display       JSONB,
  p_sales_achievement   JSONB
)
RETURNS public.import_batches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_batch_id   UUID;
  v_new_batch      public.import_batches;
  v_current_batch  public.import_batches;
  v_store_count    INTEGER;
  v_display_count  INTEGER;
  v_ach_count      INTEGER;
  v_store_row      JSONB;
  v_display_row    JSONB;
  v_ach_row        JSONB;
  v_store_id       UUID;
  v_store_name     TEXT;
BEGIN
  IF p_file_name IS NULL OR char_length(trim(p_file_name)) = 0 THEN
    RAISE EXCEPTION 'file_name is required.';
  END IF;

  IF jsonb_typeof(p_stores) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_store_display) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_sales_achievement) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'stores, store_display, and sales_achievement must be JSON arrays.';
  END IF;

  IF jsonb_array_length(p_stores) = 0 THEN
    RAISE EXCEPTION 'stores payload must not be empty.';
  END IF;

  IF jsonb_array_length(p_store_display) = 0 THEN
    RAISE EXCEPTION 'store_display payload must not be empty.';
  END IF;

  IF jsonb_array_length(p_sales_achievement) = 0 THEN
    RAISE EXCEPTION 'sales_achievement payload must not be empty.';
  END IF;

  v_display_count := jsonb_array_length(p_store_display);
  v_ach_count := jsonb_array_length(p_sales_achievement);

  -- Prevent concurrent snapshot replacements.
  PERFORM pg_advisory_xact_lock(hashtext('visit_app_operational_snapshot_replace'));

  -- Lock and supersede the current operational batch, if one exists.
  SELECT *
  INTO v_current_batch
  FROM public.import_batches
  WHERE is_current = TRUE
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.import_batches
    SET
      is_current    = FALSE,
      status        = 'superseded',
      superseded_at = NOW(),
      updated_at    = NOW()
    WHERE id = v_current_batch.id;
  END IF;

  -- Replace all operational snapshot rows (WHERE required by safe-delete policy).
  DELETE FROM public.store_display WHERE import_batch_id IS NOT NULL;
  DELETE FROM public.sales_achievement WHERE import_batch_id IS NOT NULL;
  DELETE FROM public.stores WHERE batch_id IS NOT NULL;

  -- Log the successful upload in import history.
  INSERT INTO public.import_batches (
    uploaded_by,
    file_name,
    storage_path,
    status,
    is_current,
    display_row_count,
    ach_row_count,
    display_hash,
    ach_hash,
    validation_report,
    validation_errors,
    confirmed_at
  )
  VALUES (
    p_uploaded_by,
    trim(p_file_name),
    p_storage_path,
    'confirmed',
    TRUE,
    v_display_count,
    v_ach_count,
    p_display_hash,
    p_ach_hash,
    p_validation_report,
    '[]'::JSONB,
    NOW()
  )
  RETURNING id
  INTO v_new_batch_id;

  -- Insert stores and build a name -> id map in a temp table.
  CREATE TEMP TABLE tmp_store_map (
    store_name TEXT PRIMARY KEY,
    store_id   UUID NOT NULL
  ) ON COMMIT DROP;

  FOR v_store_row IN
    SELECT value
    FROM jsonb_array_elements(p_stores)
  LOOP
    v_store_name := trim(v_store_row ->> 'name');

    IF v_store_name IS NULL OR char_length(v_store_name) = 0 THEN
      RAISE EXCEPTION 'Each store row must include a non-empty name.';
    END IF;

    INSERT INTO public.stores (
      batch_id,
      name,
      budget_channel
    )
    VALUES (
      v_new_batch_id,
      v_store_name,
      NULLIF(trim(v_store_row ->> 'budget_channel'), '')
    )
    RETURNING id
    INTO v_store_id;

    INSERT INTO tmp_store_map (store_name, store_id)
    VALUES (v_store_name, v_store_id);
  END LOOP;

  SELECT COUNT(*)
  INTO v_store_count
  FROM tmp_store_map;

  IF v_store_count = 0 THEN
    RAISE EXCEPTION 'No stores were inserted from the payload.';
  END IF;

  -- Insert Display sheet rows.
  FOR v_display_row IN
    SELECT value
    FROM jsonb_array_elements(p_store_display)
  LOOP
    v_store_name := trim(v_display_row ->> 'store_name');

    SELECT store_id
    INTO v_store_id
    FROM tmp_store_map
    WHERE store_name = v_store_name;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION
        'Display row references unknown store_name: %.',
        v_store_name;
    END IF;

    INSERT INTO public.store_display (
      import_batch_id,
      store_id,
      brand,
      sub_category,
      item_code,
      product_name,
      display_qty
    )
    VALUES (
      v_new_batch_id,
      v_store_id,
      trim(v_display_row ->> 'brand'),
      trim(v_display_row ->> 'sub_category'),
      trim(v_display_row ->> 'item_code'),
      trim(v_display_row ->> 'product_name'),
      COALESCE((v_display_row ->> 'display_qty')::INTEGER, 0)
    );
  END LOOP;

  -- Insert ACH sheet rows.
  FOR v_ach_row IN
    SELECT value
    FROM jsonb_array_elements(p_sales_achievement)
  LOOP
    v_store_name := trim(v_ach_row ->> 'store_name');

    SELECT store_id
    INTO v_store_id
    FROM tmp_store_map
    WHERE store_name = v_store_name;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION
        'ACH row references unknown store_name: %.',
        v_store_name;
    END IF;

    INSERT INTO public.sales_achievement (
      import_batch_id,
      store_id,
      brand,
      mtd_target,
      actual_sales,
      ach_percent
    )
    VALUES (
      v_new_batch_id,
      v_store_id,
      trim(v_ach_row ->> 'brand'),
      COALESCE((v_ach_row ->> 'mtd_target')::NUMERIC(14, 2), 0),
      COALESCE((v_ach_row ->> 'actual_sales')::NUMERIC(14, 2), 0),
      COALESCE((v_ach_row ->> 'ach_percent')::NUMERIC(7, 2), 0)
    );
  END LOOP;

  SELECT *
  INTO v_new_batch
  FROM public.import_batches
  WHERE id = v_new_batch_id;

  RETURN v_new_batch;
END;
$$;

COMMENT ON FUNCTION public.confirm_snapshot_import(
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB
) IS
  'Atomically replaces the operational snapshot and writes one confirmed import_batches history row.';

-- -----------------------------------------------------------------------------
-- Log a failed import attempt without touching the operational snapshot
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_failed_import(
  p_uploaded_by        UUID,
  p_file_name          TEXT,
  p_storage_path       TEXT DEFAULT NULL,
  p_display_hash       TEXT DEFAULT NULL,
  p_ach_hash           TEXT DEFAULT NULL,
  p_validation_report  JSONB DEFAULT NULL,
  p_validation_errors  JSONB DEFAULT '[]'::JSONB,
  p_error_log          JSONB DEFAULT NULL
)
RETURNS public.import_batches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.import_batches;
BEGIN
  IF p_file_name IS NULL OR char_length(trim(p_file_name)) = 0 THEN
    RAISE EXCEPTION 'file_name is required.';
  END IF;

  IF jsonb_typeof(p_validation_errors) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'validation_errors must be a JSON array.';
  END IF;

  INSERT INTO public.import_batches (
    uploaded_by,
    file_name,
    storage_path,
    status,
    is_current,
    display_hash,
    ach_hash,
    validation_report,
    validation_errors,
    error_log
  )
  VALUES (
    p_uploaded_by,
    trim(p_file_name),
    p_storage_path,
    'failed',
    FALSE,
    p_display_hash,
    p_ach_hash,
    p_validation_report,
    COALESCE(p_validation_errors, '[]'::JSONB),
    p_error_log
  )
  RETURNING *
  INTO v_batch;

  RETURN v_batch;
END;
$$;

COMMENT ON FUNCTION public.log_failed_import(
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB
) IS
  'Persists a failed import attempt to import history without modifying snapshot tables.';

-- -----------------------------------------------------------------------------
-- Read helper: return the current operational batch
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_current_import_batch()
RETURNS public.import_batches
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.import_batches
  WHERE is_current = TRUE
    AND status = 'confirmed'
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_import_batch() IS
  'Returns the current confirmed operational import batch, if one exists.';


-- =============================================================================
-- SOURCE: 20250627100400_visit_schema.sql
-- =============================================================================

-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 3
-- Migration: Historical visit schema
-- =============================================================================

-- -----------------------------------------------------------------------------
-- visits
-- Immutable after submission. Never hard-deleted.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.visits (
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

CREATE INDEX IF NOT EXISTS idx_visits_user_started_at
  ON public.visits (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_visits_store_name_started_at
  ON public.visits (store_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_visits_status
  ON public.visits (status);

CREATE INDEX IF NOT EXISTS idx_visits_import_batch_id
  ON public.visits (import_batch_id);

CREATE INDEX IF NOT EXISTS idx_visits_submitted_at
  ON public.visits (submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_visits_submitted_by
  ON public.visits (submitted_by);

DROP TRIGGER IF EXISTS set_visits_updated_at ON public.visits;

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

CREATE TABLE IF NOT EXISTS public.visit_observations (
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_visit_observations_visit_item_code
  ON public.visit_observations (visit_id, item_code);

CREATE INDEX IF NOT EXISTS idx_visit_observations_visit_id
  ON public.visit_observations (visit_id);

CREATE INDEX IF NOT EXISTS idx_visit_observations_visit_status_id
  ON public.visit_observations (visit_status_id);

CREATE INDEX IF NOT EXISTS idx_visit_observations_visit_display_order
  ON public.visit_observations (visit_id, display_order);

CREATE INDEX IF NOT EXISTS idx_visit_observations_item_code
  ON public.visit_observations (item_code);

DROP TRIGGER IF EXISTS set_visit_observations_updated_at ON public.visit_observations;

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

CREATE TABLE IF NOT EXISTS public.visit_photos (
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

CREATE INDEX IF NOT EXISTS idx_visit_photos_visit_sort
  ON public.visit_photos (visit_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_visit_photos_visit_observation_id
  ON public.visit_photos (visit_observation_id);

CREATE INDEX IF NOT EXISTS idx_visit_photos_uploaded_by
  ON public.visit_photos (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_visit_photos_photo_type
  ON public.visit_photos (photo_type);

DROP TRIGGER IF EXISTS set_visit_photos_updated_at ON public.visit_photos;

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

CREATE TABLE IF NOT EXISTS public.pdf_reports (
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

CREATE INDEX IF NOT EXISTS idx_pdf_reports_visit_current
  ON public.pdf_reports (visit_id, is_current);

CREATE INDEX IF NOT EXISTS idx_pdf_reports_generated_by
  ON public.pdf_reports (generated_by);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pdf_reports_visit_current
  ON public.pdf_reports (visit_id)
  WHERE is_current = TRUE;

DROP TRIGGER IF EXISTS set_pdf_reports_updated_at ON public.pdf_reports;

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

DROP TRIGGER IF EXISTS enforce_visit_photo_observation_alignment ON public.visit_photos;

CREATE TRIGGER enforce_visit_photo_observation_alignment
  BEFORE INSERT OR UPDATE ON public.visit_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_visit_photo_observation_alignment();


-- =============================================================================
-- SOURCE: 20250627100500_visit_submission_rules.sql
-- =============================================================================

-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 3
-- Migration: Visit workflow, submission rules, and PDF constraints
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Ownership helper for later RLS policies
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.owns_visit(p_visit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visits
    WHERE id = p_visit_id
      AND user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.owns_visit(UUID) IS
  'Returns TRUE when the authenticated user owns the given visit.';

-- -----------------------------------------------------------------------------
-- Submit a Draft visit
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_visit(p_visit_id UUID)
RETURNS public.visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit public.visits;
BEGIN
  SELECT *
  INTO v_visit
  FROM public.visits
  WHERE id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', p_visit_id;
  END IF;

  IF v_visit.status IS DISTINCT FROM 'Draft' THEN
    RAISE EXCEPTION
      'Visit % is already submitted and cannot be submitted again.',
      p_visit_id;
  END IF;

  UPDATE public.visits
  SET
    status       = 'Submitted',
    submitted_at = NOW(),
    submitted_by = auth.uid(),
    updated_at   = NOW()
  WHERE id = p_visit_id
  RETURNING *
  INTO v_visit;

  RETURN v_visit;
END;
$$;

COMMENT ON FUNCTION public.submit_visit(UUID) IS
  'Submits a Draft visit and records submitted_at/submitted_by.';

-- -----------------------------------------------------------------------------
-- Prevent mutation of submitted visits
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_submitted_visit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'Submitted' THEN
    RAISE EXCEPTION
      'Submitted visit % is immutable and cannot be updated.',
      OLD.id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Visits are never deleted.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_submitted_visit_mutation ON public.visits;

CREATE TRIGGER prevent_submitted_visit_mutation
  BEFORE UPDATE OR DELETE ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_submitted_visit_mutation();

-- -----------------------------------------------------------------------------
-- Prevent mutation of observations and photos once visit is submitted
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_submitted_visit_child_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_visit_id UUID;
  v_visit_status TEXT;
BEGIN
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

  IF v_visit_status = 'Submitted' THEN
    RAISE EXCEPTION
      'Visit % is submitted. % rows are immutable.',
      v_visit_id,
      TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_submitted_visit_observation_mutation ON public.visit_observations;

CREATE TRIGGER prevent_submitted_visit_observation_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.visit_observations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_submitted_visit_child_mutation();

DROP TRIGGER IF EXISTS prevent_submitted_visit_photo_mutation ON public.visit_photos;

CREATE TRIGGER prevent_submitted_visit_photo_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.visit_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_submitted_visit_child_mutation();

-- -----------------------------------------------------------------------------
-- PDF reports may only be created after successful visit submission
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_pdf_report_submitted_visit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_visit_status TEXT;
BEGIN
  SELECT status
  INTO v_visit_status
  FROM public.visits
  WHERE id = NEW.visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', NEW.visit_id;
  END IF;

  IF v_visit_status IS DISTINCT FROM 'Submitted' THEN
    RAISE EXCEPTION
      'PDF reports can only be generated after visit % is submitted.',
      NEW.visit_id;
  END IF;

  IF NEW.generated_by IS NULL THEN
    NEW.generated_by := auth.uid();
  END IF;

  IF TG_OP = 'INSERT' AND NEW.is_current = TRUE THEN
    UPDATE public.pdf_reports
    SET
      is_current = FALSE,
      updated_at = NOW()
    WHERE visit_id = NEW.visit_id
      AND is_current = TRUE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pdf_report_submitted_visit ON public.pdf_reports;

CREATE TRIGGER enforce_pdf_report_submitted_visit
  BEFORE INSERT ON public.pdf_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pdf_report_submitted_visit();

CREATE OR REPLACE FUNCTION public.prevent_submitted_pdf_report_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PDF reports are never deleted.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_submitted_pdf_report_delete ON public.pdf_reports;

CREATE TRIGGER prevent_submitted_pdf_report_delete
  BEFORE DELETE ON public.pdf_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_submitted_pdf_report_mutation();

COMMENT ON FUNCTION public.enforce_pdf_report_submitted_visit() IS
  'Ensures PDF generation happens only after a visit has been submitted.';


-- =============================================================================
-- SOURCE: 20250627100600_auth_and_submit_validation.sql
-- =============================================================================

-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 4
-- Migration: Auth integration and submit validation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Auto-create profile when a Supabase Auth user is created
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    username,
    role,
    phone,
    is_active
  )
  VALUES (
    NEW.id,
    '',
    lower(split_part(COALESCE(NEW.email, ''), '@', 1)),
    'Visitor',
    NULL,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates a default public.profiles row when a Supabase Auth user is created.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT INSERT, SELECT, UPDATE
  ON public.profiles
  TO supabase_auth_admin;

-- -----------------------------------------------------------------------------
-- Prevent non-admins from changing privileged profile fields
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_profile_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only admins can change user roles.';
    END IF;

    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Only admins can change account activation status.';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Profile id cannot be changed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_update_rules ON public.profiles;

DROP TRIGGER IF EXISTS enforce_profile_update_rules ON public.profiles;

CREATE TRIGGER enforce_profile_update_rules
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_update_rules();

-- -----------------------------------------------------------------------------
-- Draft visit helper
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_draft_visit(p_visit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visits
    WHERE id = p_visit_id
      AND status = 'Draft'
  );
$$;

COMMENT ON FUNCTION public.is_draft_visit(UUID) IS
  'Returns TRUE when the visit exists and is still in Draft status.';

-- -----------------------------------------------------------------------------
-- Submit with validation
-- Rules:
--   1. Store selected
--   2. At least one observation
--   3. Every observation has a status
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_visit(p_visit_id UUID)
RETURNS public.visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit public.visits;
  v_observation_count INTEGER;
BEGIN
  SELECT *
  INTO v_visit
  FROM public.visits
  WHERE id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', p_visit_id;
  END IF;

  IF NOT public.is_admin() AND v_visit.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You are not authorized to submit this visit.';
  END IF;

  IF v_visit.status IS DISTINCT FROM 'Draft' THEN
    RAISE EXCEPTION
      'Visit % is already submitted and is read-only.',
      p_visit_id;
  END IF;

  IF v_visit.store_name IS NULL OR char_length(trim(v_visit.store_name)) = 0 THEN
    RAISE EXCEPTION 'A store must be selected before submitting the visit.';
  END IF;

  SELECT COUNT(*)
  INTO v_observation_count
  FROM public.visit_observations
  WHERE visit_id = p_visit_id;

  IF v_observation_count = 0 THEN
    RAISE EXCEPTION
      'At least one observation is required before submitting the visit.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.visit_observations AS vo
    WHERE vo.visit_id = p_visit_id
      AND vo.visit_status_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Every observation must have a status before submitting the visit.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.visit_observations AS vo
    LEFT JOIN public.visit_statuses AS vs ON vs.id = vo.visit_status_id
    WHERE vo.visit_id = p_visit_id
      AND (vs.id IS NULL OR vs.is_active = FALSE)
  ) THEN
    RAISE EXCEPTION
      'Every observation must have a valid active status before submitting the visit.';
  END IF;

  UPDATE public.visits
  SET
    status       = 'Submitted',
    submitted_at = NOW(),
    submitted_by = auth.uid(),
    updated_at   = NOW()
  WHERE id = p_visit_id
  RETURNING *
  INTO v_visit;

  RETURN v_visit;
END;
$$;

COMMENT ON FUNCTION public.submit_visit(UUID) IS
  'Validates and submits a Draft visit. Submitted visits become read-only.';

-- -----------------------------------------------------------------------------
-- Block PDF report updates after creation (Version 1 read-only)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_pdf_report_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_current = TRUE
       AND NEW.is_current = FALSE
       AND NEW.visit_id = OLD.visit_id
       AND NEW.storage_path = OLD.storage_path
       AND NEW.file_name = OLD.file_name
       AND NEW.generated_by IS NOT DISTINCT FROM OLD.generated_by
       AND NEW.file_size_bytes IS NOT DISTINCT FROM OLD.file_size_bytes
       AND NEW.version = OLD.version THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'PDF reports are read-only after creation.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PDF reports are never deleted.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_submitted_pdf_report_delete ON public.pdf_reports;

DROP TRIGGER IF EXISTS prevent_pdf_report_immutable ON public.pdf_reports;

CREATE TRIGGER prevent_pdf_report_immutable
  BEFORE UPDATE OR DELETE ON public.pdf_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_pdf_report_update();

-- Allow is_current demotion during new PDF insert via a dedicated helper.

CREATE OR REPLACE FUNCTION public.create_visit_pdf_report(
  p_visit_id       UUID,
  p_storage_path   TEXT,
  p_file_name      TEXT,
  p_file_size_bytes BIGINT DEFAULT NULL,
  p_version        INTEGER DEFAULT 1
)
RETURNS public.pdf_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.pdf_reports;
  v_visit_status TEXT;
BEGIN
  SELECT status
  INTO v_visit_status
  FROM public.visits
  WHERE id = p_visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % was not found.', p_visit_id;
  END IF;

  IF v_visit_status IS DISTINCT FROM 'Submitted' THEN
    RAISE EXCEPTION
      'PDF reports can only be generated after visit % is submitted.',
      p_visit_id;
  END IF;

  IF NOT public.is_admin() AND NOT public.owns_visit(p_visit_id) THEN
    RAISE EXCEPTION 'You are not authorized to create a PDF for this visit.';
  END IF;

  UPDATE public.pdf_reports
  SET
    is_current = FALSE,
    updated_at = NOW()
  WHERE visit_id = p_visit_id
    AND is_current = TRUE;

  INSERT INTO public.pdf_reports (
    visit_id,
    generated_by,
    storage_path,
    file_name,
    file_size_bytes,
    version,
    is_current
  )
  VALUES (
    p_visit_id,
    auth.uid(),
    p_storage_path,
    p_file_name,
    p_file_size_bytes,
    GREATEST(p_version, 1),
    TRUE
  )
  RETURNING *
  INTO v_report;

  RETURN v_report;
END;
$$;

COMMENT ON FUNCTION public.create_visit_pdf_report(
  UUID, TEXT, TEXT, BIGINT, INTEGER
) IS
  'Creates a PDF report for a submitted visit and marks it as the current version.';

-- Remove direct-insert trigger in favour of the helper above.
DROP TRIGGER IF EXISTS enforce_pdf_report_submitted_visit ON public.pdf_reports;

DROP FUNCTION IF EXISTS public.prevent_submitted_pdf_report_mutation();


-- =============================================================================
-- SOURCE: 20250627100700_rls_policies.sql
-- =============================================================================

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

DROP POLICY IF EXISTS admin_all_profiles ON public.profiles;

CREATE POLICY admin_all_profiles
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_all_visit_statuses ON public.visit_statuses;

CREATE POLICY admin_all_visit_statuses
  ON public.visit_statuses FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_all_app_settings ON public.app_settings;

CREATE POLICY admin_all_app_settings
  ON public.app_settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_all_import_batches ON public.import_batches;

CREATE POLICY admin_all_import_batches
  ON public.import_batches FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_all_stores ON public.stores;

CREATE POLICY admin_all_stores
  ON public.stores FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_all_store_display ON public.store_display;

CREATE POLICY admin_all_store_display
  ON public.store_display FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_all_sales_achievement ON public.sales_achievement;

CREATE POLICY admin_all_sales_achievement
  ON public.sales_achievement FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_all_visits ON public.visits;

CREATE POLICY admin_all_visits
  ON public.visits FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_all_visit_observations ON public.visit_observations;

CREATE POLICY admin_all_visit_observations
  ON public.visit_observations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_all_visit_photos ON public.visit_photos;

CREATE POLICY admin_all_visit_photos
  ON public.visit_photos FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_all_pdf_reports ON public.pdf_reports;

CREATE POLICY admin_all_pdf_reports
  ON public.pdf_reports FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================================================
-- Visitor — profiles
-- =============================================================================

DROP POLICY IF EXISTS visitor_select_own_profile ON public.profiles;

CREATE POLICY visitor_select_own_profile
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_visitor() AND public.is_active_user() AND id = auth.uid());

DROP POLICY IF EXISTS visitor_update_own_profile ON public.profiles;

CREATE POLICY visitor_update_own_profile
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_visitor() AND public.is_active_user() AND id = auth.uid())
  WITH CHECK (public.is_visitor() AND public.is_active_user() AND id = auth.uid());

-- =============================================================================
-- Visitor — read application data
-- =============================================================================

DROP POLICY IF EXISTS visitor_read_visit_statuses ON public.visit_statuses;

CREATE POLICY visitor_read_visit_statuses
  ON public.visit_statuses FOR SELECT TO authenticated
  USING (public.is_visitor() AND public.is_active_user() AND is_active = TRUE);

DROP POLICY IF EXISTS visitor_read_app_settings ON public.app_settings;

CREATE POLICY visitor_read_app_settings
  ON public.app_settings FOR SELECT TO authenticated
  USING (public.is_visitor() AND public.is_active_user());

DROP POLICY IF EXISTS visitor_read_stores ON public.stores;

CREATE POLICY visitor_read_stores
  ON public.stores FOR SELECT TO authenticated
  USING (public.is_visitor() AND public.is_active_user());

DROP POLICY IF EXISTS visitor_read_store_display ON public.store_display;

CREATE POLICY visitor_read_store_display
  ON public.store_display FOR SELECT TO authenticated
  USING (public.is_visitor() AND public.is_active_user());

DROP POLICY IF EXISTS visitor_read_sales_achievement ON public.sales_achievement;

CREATE POLICY visitor_read_sales_achievement
  ON public.sales_achievement FOR SELECT TO authenticated
  USING (public.is_visitor() AND public.is_active_user());

-- =============================================================================
-- Visitor — visits (Draft autosave + read submitted)
-- =============================================================================

DROP POLICY IF EXISTS visitor_select_own_visits ON public.visits;

CREATE POLICY visitor_select_own_visits
  ON public.visits FOR SELECT TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS visitor_insert_draft_visits ON public.visits;

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

DROP POLICY IF EXISTS visitor_update_own_draft_visits ON public.visits;

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

DROP POLICY IF EXISTS visitor_select_own_observations ON public.visit_observations;

CREATE POLICY visitor_select_own_observations
  ON public.visit_observations FOR SELECT TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
  );

DROP POLICY IF EXISTS visitor_insert_draft_observations ON public.visit_observations;

CREATE POLICY visitor_insert_draft_observations
  ON public.visit_observations FOR INSERT TO authenticated
  WITH CHECK (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
    AND public.is_draft_visit(visit_id)
  );

DROP POLICY IF EXISTS visitor_update_draft_observations ON public.visit_observations;

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

DROP POLICY IF EXISTS visitor_select_own_photos ON public.visit_photos;

CREATE POLICY visitor_select_own_photos
  ON public.visit_photos FOR SELECT TO authenticated
  USING (
    public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit(visit_id)
  );

DROP POLICY IF EXISTS visitor_insert_draft_photos ON public.visit_photos;

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

DROP POLICY IF EXISTS visitor_select_own_pdf_reports ON public.pdf_reports;

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


-- =============================================================================
-- SOURCE: 20250627100800_seed_data.sql
-- =============================================================================

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
    '"BTECH Visit App"'::JSONB,
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


-- =============================================================================
-- SOURCE: 20250627100900_storage_bucket.sql
-- =============================================================================

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

DROP POLICY IF EXISTS visit_photos_storage_admin_all ON storage.objects;

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

DROP POLICY IF EXISTS visit_photos_storage_visitor_select ON storage.objects;

CREATE POLICY visit_photos_storage_visitor_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'visit-photos'
    AND public.is_visitor()
    AND public.is_active_user()
    AND public.owns_visit((storage.foldername(name))[1]::UUID)
  );

DROP POLICY IF EXISTS visit_photos_storage_visitor_insert ON storage.objects;

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


-- =============================================================================
-- SOURCE: 20250627101000_auth_user_profile_trigger.sql
-- =============================================================================

-- =============================================================================
-- Visit APP By Gimi — Auth user → profile auto-provisioning
-- Migration: Ensure profile row is created for every new auth.users row
-- =============================================================================
--
-- When an admin creates a user in Supabase Auth (Dashboard or API), this
-- trigger inserts a matching public.profiles row with safe defaults.
-- Admins can update full_name, role, and other fields from the application.
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_full_name_not_empty_check;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    username,
    role,
    phone,
    is_active
  )
  VALUES (
    NEW.id,
    '',
    lower(split_part(COALESCE(NEW.email, ''), '@', 1)),
    'Visitor',
    NULL,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates a default public.profiles row when a Supabase Auth user is created.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT INSERT, SELECT, UPDATE
  ON public.profiles
  TO supabase_auth_admin;

