-- ============================================================
-- Winipat - Migration 016
-- Make RLS permission-aware: admin access at the database layer now
-- flows from the `admin.access` group permission (migration 015)
-- instead of the raw profiles.role flag.
--
-- is_admin() is used by ~20 "admins full access" RLS policies across
-- the schema. Redefining it here flips every one of those policies to
-- the group/permission system in a single, low-risk change — no policy
-- rewrites, no lockout:
--
--   * Every existing admin was backfilled into the `super-admin` group
--     by migration 015 (which holds `admin.access`), so they keep access.
--   * The `OR role = 'admin'` fallback is retained as a safety net so a
--     directly-set admin row still works even before groups are synced.
--
-- Per-ACTION granularity (e.g. only Payout Approvers can process payouts)
-- is enforced at the API layer via requirePermission(...). Splitting the
-- coarse "admins full access" policies into per-permission read policies
-- is a future follow-up tracked in docs/security-groups-design.md.
--
-- IMPORTANT: apply migration 015 BEFORE this one.
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    has_permission('admin.access')
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    );
$$;

NOTIFY pgrst, 'reload schema';
