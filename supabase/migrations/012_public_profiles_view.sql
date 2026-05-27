-- ============================================================
-- Winipat - Migration 012
-- public_profiles view — exposes display-safe profile fields
-- (id, full_name, avatar_url, role) for use in joins where the
-- viewer is not the profile owner.
--
-- The profiles table itself is locked down by RLS to the owner
-- + admins. That's correct for email/phone privacy but means
-- buyers see "Unknown user" in their messages with sellers,
-- sellers see "Customer" instead of buyer names, and review
-- pages show "Verified buyer" instead of real names. The view
-- formalises the platform-public subset that's already shown
-- in the UI as a matter of marketplace function, without
-- leaking email or phone.
--
-- View is SECURITY DEFINER (security_invoker=off) so it
-- bypasses the underlying profiles RLS. Grant SELECT to
-- authenticated only — not to anon — so unauthenticated
-- visitors can't enumerate users.
-- ============================================================

CREATE OR REPLACE VIEW public_profiles
WITH (security_invoker = off) AS
SELECT
  id,
  full_name,
  avatar_url,
  role
FROM profiles;

GRANT SELECT ON public_profiles TO authenticated;
REVOKE ALL ON public_profiles FROM anon;

COMMENT ON VIEW public_profiles IS
  'Display-safe subset of profiles for cross-user joins (messages, reviews, order parties). Bypasses RLS; exposes only fields already visible to other users in the UI.';

NOTIFY pgrst, 'reload schema';
