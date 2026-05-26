-- ============================================================
-- ADMIN BOOTSTRAP — one-off script
--
-- Use this in the Supabase SQL editor to promote a user to admin
-- AFTER they've signed up normally (as buyer or seller) through
-- /register or Google/Facebook OAuth.
--
-- This is the ONLY supported way to create an admin account.
-- Never expose this as an API. The fact that you need a service-
-- role key to run it in the Supabase dashboard IS the security.
--
-- Steps:
--   1. The future admin signs up at https://www.winipat.com/register
--      (or via Google/Facebook). They get a buyer or seller profile.
--   2. Edit the email below to match their signup email.
--   3. Paste this whole script into Supabase SQL editor and Run.
--   4. Refresh winipat.com — they're now an admin and the proxy
--      will route them to /admin on next page load.
-- ============================================================

DO $$
DECLARE
  v_target_email TEXT := 'support@winipat.com';  -- <-- EDIT THIS
  v_user_id      UUID;
  v_current_role user_role;
BEGIN
  -- Locate the profile by their auth.users.email
  SELECT p.id, p.role
    INTO v_user_id, v_current_role
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = v_target_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'No profile found for email %. The user must sign up first via /register or OAuth.',
      v_target_email;
  END IF;

  IF v_current_role = 'admin' THEN
    RAISE NOTICE 'User % is already an admin. Nothing to do.', v_target_email;
    RETURN;
  END IF;

  UPDATE profiles
  SET role = 'admin'::user_role,
      updated_at = now()
  WHERE id = v_user_id;

  RAISE NOTICE 'Promoted % (was: %) to admin. They can now access /admin.',
    v_target_email, v_current_role;
END $$;
