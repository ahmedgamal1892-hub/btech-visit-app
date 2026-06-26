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
