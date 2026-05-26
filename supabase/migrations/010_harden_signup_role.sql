-- ============================================================
-- Winipat - Migration 010
-- SECURITY: Harden handle_new_user() so public signups can only
-- create buyer or seller accounts.
--
-- The previous trigger trusted whatever role value came in
-- raw_user_meta_data, which meant anyone with the public anon
-- key could call supabase.auth.signUp({ data: { role: 'admin' } })
-- and instantly create an admin account. This migration clamps
-- the requested role: if it's anything other than 'buyer' or
-- 'seller', the trigger falls back to 'buyer'.
--
-- Admin and logistics accounts must now be created out-of-band:
-- a service-role key holder issues a direct UPDATE in the
-- Supabase SQL editor (see safe-admin-create.sql snippet).
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requested_role TEXT;
  final_role user_role;
BEGIN
  requested_role := NEW.raw_user_meta_data->>'role';

  -- Only buyer and seller are user-selectable. Anything else
  -- (admin, logistics, null, garbage) falls back to buyer.
  IF requested_role = 'seller' THEN
    final_role := 'seller'::user_role;
  ELSE
    final_role := 'buyer'::user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    final_role
  );
  RETURN NEW;
END;
$$;

-- Trigger itself is unchanged; replacing the function above is enough.
