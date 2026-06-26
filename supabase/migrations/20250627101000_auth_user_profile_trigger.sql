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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT INSERT, SELECT, UPDATE
  ON public.profiles
  TO supabase_auth_admin;
