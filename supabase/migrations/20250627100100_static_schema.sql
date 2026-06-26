-- =============================================================================
-- Visit APP By Gimi — Sprint 2.2.1 · Package 1
-- Migration: Static schema — profiles, visit_statuses, app_settings
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- Linked 1:1 with auth.users. Passwords are never stored here.
-- -----------------------------------------------------------------------------

CREATE TABLE public.profiles (
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

CREATE UNIQUE INDEX uq_profiles_username
  ON public.profiles (username);

CREATE INDEX idx_profiles_role
  ON public.profiles (role);

CREATE INDEX idx_profiles_is_active
  ON public.profiles (is_active);

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

CREATE TABLE public.visit_statuses (
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

CREATE UNIQUE INDEX uq_visit_statuses_code
  ON public.visit_statuses (code);

CREATE INDEX idx_visit_statuses_is_active
  ON public.visit_statuses (is_active);

CREATE INDEX idx_visit_statuses_sort_order
  ON public.visit_statuses (sort_order);

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

CREATE TABLE public.app_settings (
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

CREATE UNIQUE INDEX uq_app_settings_key
  ON public.app_settings (key);

CREATE INDEX idx_app_settings_updated_by
  ON public.app_settings (updated_by);

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
