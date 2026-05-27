-- ============================================================
-- Winipat - Migration 013
-- Update handle_new_user() trigger to support phone-only signups.
--
-- Previously the trigger expected NEW.email to be set (the
-- profiles.email column is NOT NULL). Phone-OTP signups create
-- an auth.users row with email = NULL and phone = '+234...',
-- which would fail the trigger and lose the row.
--
-- New behaviour:
--   - email pulled from auth.users.email, then raw_user_meta_data.email,
--     then a synthetic placeholder ('phone-user-<uuid>@placeholder.winipat.com')
--     so the NOT NULL constraint is satisfied; user can swap the
--     placeholder for a real address later in profile.
--   - phone pulled from auth.users.phone, then raw_user_meta_data.phone
--   - full_name pulled from raw_user_meta_data, falling back to the
--     local part of whatever email we ended up with.
--
-- The role-clamping logic from migration 010 is preserved (only
-- 'buyer' or 'seller' may be self-assigned; admin/logistics must
-- still be granted out-of-band).
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requested_role TEXT;
  final_role     user_role;
  v_email        TEXT;
  v_phone        TEXT;
  v_full_name    TEXT;
BEGIN
  requested_role := NEW.raw_user_meta_data->>'role';
  IF requested_role = 'seller' THEN
    final_role := 'seller'::user_role;
  ELSE
    final_role := 'buyer'::user_role;
  END IF;

  -- Resolve email: auth.users.email > metadata.email > synthetic placeholder
  v_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
  IF v_email IS NULL OR v_email = '' THEN
    v_email := 'phone-user-' || NEW.id || '@placeholder.winipat.com';
  END IF;

  -- Resolve phone: auth.users.phone > metadata.phone (may stay NULL)
  v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');

  -- Resolve full_name with safe fallback
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(v_email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, phone, full_name, role)
  VALUES (NEW.id, v_email, v_phone, v_full_name, final_role);
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
