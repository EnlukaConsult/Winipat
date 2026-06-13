-- ============================================================
-- Winipat - Migration 015
-- Security Groups / RBAC foundation.
--
-- Adds a group-based permission layer on top of the existing
-- profiles.role enum. role stays as the user's "primary persona"
-- (drives landing + default group); all PERMISSIONS now flow from
-- group membership:
--
--   permissions --< group_permissions >-- security_groups
--                                              |
--                                         user_groups >-- profiles
--
-- A user's effective permissions = the UNION of permissions across
-- every group they belong to. Enforced server-side via has_permission().
--
-- This migration is additive and backward-compatible: existing
-- is_admin()-based RLS keeps working. Migration 016 flips sensitive
-- policies to has_permission() once the app code is in place.
--
-- See docs/security-groups-design.md for the full design.
-- ============================================================

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

-- Atomic permission catalog. Keys are dot-namespaced (e.g. 'disputes.resolve').
CREATE TABLE IF NOT EXISTS permissions (
  key         TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'admin'  -- admin | seller | buyer | logistics
);

-- Named groups. primary_persona, when set, marks this as the default
-- group auto-assigned to users whose role matches. is_system groups
-- cannot be deleted from the UI.
CREATE TABLE IF NOT EXISTS security_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  is_system       BOOLEAN NOT NULL DEFAULT false,
  primary_persona user_role,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one default group per persona.
CREATE UNIQUE INDEX IF NOT EXISTS uq_security_groups_persona
  ON security_groups (primary_persona)
  WHERE primary_persona IS NOT NULL;

CREATE TABLE IF NOT EXISTS group_permissions (
  group_id       UUID NOT NULL REFERENCES security_groups(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permissions(key)    ON DELETE CASCADE,
  PRIMARY KEY (group_id, permission_key)
);

CREATE TABLE IF NOT EXISTS user_groups (
  user_id     UUID NOT NULL REFERENCES profiles(id)        ON DELETE CASCADE,
  group_id    UUID NOT NULL REFERENCES security_groups(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_user_groups_user_id  ON user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group_id ON user_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_group_id ON group_permissions(group_id);

-- ------------------------------------------------------------
-- Permission-check helpers (SECURITY DEFINER bypasses RLS inside,
-- so they are safe to call from RLS policies without recursion —
-- same pattern as the existing is_admin()).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION has_permission(perm TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_groups ug
    JOIN group_permissions gp ON gp.group_id = ug.group_id
    WHERE ug.user_id = auth.uid()
      AND gp.permission_key = perm
  );
$$;

-- Returns the full set of permission keys for the current user.
CREATE OR REPLACE FUNCTION my_permissions()
RETURNS SETOF TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT gp.permission_key
  FROM user_groups ug
  JOIN group_permissions gp ON gp.group_id = ug.group_id
  WHERE ug.user_id = auth.uid();
$$;

-- ------------------------------------------------------------
-- Seed: permission catalog
-- ------------------------------------------------------------
INSERT INTO permissions (key, description, category) VALUES
  ('admin.access',            'Access the admin portal',                'admin'),
  ('disputes.view',           'View disputes',                          'admin'),
  ('disputes.resolve',        'Resolve disputes',                       'admin'),
  ('payouts.view',            'View payouts',                           'admin'),
  ('payouts.approve',         'Approve / process payouts',              'admin'),
  ('settlements.view',        'View escrow settlements',                'admin'),
  ('sellers.view',            'View seller KYC submissions',            'admin'),
  ('sellers.approve',         'Approve / reject seller KYC',            'admin'),
  ('products.moderate',       'Moderate (approve/reject) products',     'admin'),
  ('enquiries.manage',        'Manage support enquiries',               'admin'),
  ('analytics.view',          'View analytics',                         'admin'),
  ('settings.manage',         'Manage platform settings',               'admin'),
  ('team.manage',             'Manage the admin team',                  'admin'),
  ('groups.manage',           'Manage security groups & permissions',   'admin'),
  ('seller.access',           'Access the seller portal',               'seller'),
  ('products.list',           'List / manage own products',             'seller'),
  ('products.bulk_upload',    'Bulk-upload products',                   'seller'),
  ('seller.earnings.view',    'View own earnings',                      'seller'),
  ('seller.disputes.respond', 'Respond to disputes',                    'seller'),
  ('buyer.access',            'Access the buyer portal',                'buyer'),
  ('marketplace.buy',         'Place orders',                           'buyer'),
  ('orders.manage',           'Manage own orders',                      'buyer'),
  ('messages.use',            'Use buyer/seller messaging',             'buyer'),
  ('logistics.access',        'Access the logistics portal',            'logistics'),
  ('pickups.manage',          'Manage pickups',                         'logistics'),
  ('deliveries.manage',       'Manage deliveries',                      'logistics')
ON CONFLICT (key) DO UPDATE
  SET description = EXCLUDED.description,
      category    = EXCLUDED.category;

-- ------------------------------------------------------------
-- Seed: groups
-- ------------------------------------------------------------
INSERT INTO security_groups (slug, name, description, is_system, primary_persona) VALUES
  ('super-admin',       'Super Admin',       'Full access to every part of the admin portal.',                 true,  NULL),
  ('default-admin',     'Admin (base)',      'Default group for staff: admin portal access only.',             true,  'admin'),
  ('default-seller',    'Seller',            'Default group auto-assigned to sellers.',                        true,  'seller'),
  ('default-buyer',     'Buyer',             'Default group auto-assigned to buyers.',                         true,  'buyer'),
  ('default-logistics', 'Logistics',         'Default group auto-assigned to logistics partners.',             true,  'logistics'),
  ('dispute-managers',  'Dispute Managers',  'Review evidence and resolve buyer/seller disputes.',             false, NULL),
  ('payout-approvers',  'Payout Approvers',  'Review and approve seller payouts and settlements.',             false, NULL),
  ('kyc-reviewers',     'KYC Reviewers',     'Review and approve/reject seller KYC submissions.',              false, NULL),
  ('support-agents',    'Support Agents',    'Handle support enquiries and view disputes.',                    false, NULL),
  ('read-only-analyst', 'Read-only Analyst', 'View-only access to analytics, disputes, payouts and sellers.',  false, NULL)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- Seed: group -> permission assignments
-- ------------------------------------------------------------

-- super-admin gets EVERY permission.
INSERT INTO group_permissions (group_id, permission_key)
SELECT g.id, p.key
FROM security_groups g
CROSS JOIN permissions p
WHERE g.slug = 'super-admin'
ON CONFLICT DO NOTHING;

-- All other groups get an explicit slice.
INSERT INTO group_permissions (group_id, permission_key)
SELECT g.id, v.perm
FROM (VALUES
  ('default-admin',     'admin.access'),

  ('dispute-managers',  'admin.access'),
  ('dispute-managers',  'disputes.view'),
  ('dispute-managers',  'disputes.resolve'),

  ('payout-approvers',  'admin.access'),
  ('payout-approvers',  'payouts.view'),
  ('payout-approvers',  'payouts.approve'),
  ('payout-approvers',  'settlements.view'),

  ('kyc-reviewers',     'admin.access'),
  ('kyc-reviewers',     'sellers.view'),
  ('kyc-reviewers',     'sellers.approve'),

  ('support-agents',    'admin.access'),
  ('support-agents',    'enquiries.manage'),
  ('support-agents',    'disputes.view'),

  ('read-only-analyst', 'admin.access'),
  ('read-only-analyst', 'analytics.view'),
  ('read-only-analyst', 'disputes.view'),
  ('read-only-analyst', 'payouts.view'),
  ('read-only-analyst', 'settlements.view'),
  ('read-only-analyst', 'sellers.view'),

  ('default-seller',    'seller.access'),
  ('default-seller',    'products.list'),
  ('default-seller',    'products.bulk_upload'),
  ('default-seller',    'seller.earnings.view'),
  ('default-seller',    'seller.disputes.respond'),

  ('default-buyer',     'buyer.access'),
  ('default-buyer',     'marketplace.buy'),
  ('default-buyer',     'orders.manage'),
  ('default-buyer',     'messages.use'),

  ('default-logistics', 'logistics.access'),
  ('default-logistics', 'pickups.manage'),
  ('default-logistics', 'deliveries.manage')
) AS v(slug, perm)
JOIN security_groups g ON g.slug = v.slug
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Auto-assign default persona group on signup / role change.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_default_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  default_gid UUID;
BEGIN
  -- On role change, drop membership in OTHER persona-default groups so the
  -- persona default always reflects the current role. Staff groups
  -- (primary_persona IS NULL) are never touched here.
  IF (TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role) THEN
    DELETE FROM user_groups ug
    USING security_groups g
    WHERE ug.user_id = NEW.id
      AND ug.group_id = g.id
      AND g.primary_persona IS NOT NULL
      AND g.primary_persona <> NEW.role;
  END IF;

  SELECT id INTO default_gid
  FROM security_groups
  WHERE primary_persona = NEW.role;

  IF default_gid IS NOT NULL THEN
    INSERT INTO user_groups (user_id, group_id)
    VALUES (NEW.id, default_gid)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_default_group_trigger ON profiles;
CREATE TRIGGER assign_default_group_trigger
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_group();

-- ------------------------------------------------------------
-- Backfill existing users
-- ------------------------------------------------------------

-- Everyone -> their persona default group.
INSERT INTO user_groups (user_id, group_id)
SELECT pr.id, g.id
FROM profiles pr
JOIN security_groups g ON g.primary_persona = pr.role
ON CONFLICT DO NOTHING;

-- Existing admins -> super-admin, so nobody is locked out when migration
-- 016 flips RLS to has_permission(). New admins get default-admin only.
INSERT INTO user_groups (user_id, group_id)
SELECT pr.id, g.id
FROM profiles pr
CROSS JOIN security_groups g
WHERE pr.role = 'admin' AND g.slug = 'super-admin'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- RLS on the new tables
-- ------------------------------------------------------------
ALTER TABLE permissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_groups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_groups       ENABLE ROW LEVEL SECURITY;

-- Permission catalog: readable by any signed-in user (the UI needs it to
-- render the matrix; it leaks nothing sensitive). Writable by nobody via
-- the API (seeded by migrations only).
DROP POLICY IF EXISTS "permissions: read for authed" ON permissions;
CREATE POLICY "permissions: read for authed"
  ON permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- security_groups: readable by groups.manage holders; full write for them.
DROP POLICY IF EXISTS "security_groups: manager read" ON security_groups;
CREATE POLICY "security_groups: manager read"
  ON security_groups FOR SELECT
  USING (has_permission('groups.manage'));

DROP POLICY IF EXISTS "security_groups: manager write" ON security_groups;
CREATE POLICY "security_groups: manager write"
  ON security_groups FOR ALL
  USING (has_permission('groups.manage'))
  WITH CHECK (has_permission('groups.manage'));

-- group_permissions: manager-only.
DROP POLICY IF EXISTS "group_permissions: manager all" ON group_permissions;
CREATE POLICY "group_permissions: manager all"
  ON group_permissions FOR ALL
  USING (has_permission('groups.manage'))
  WITH CHECK (has_permission('groups.manage'));

-- user_groups: a user can read their OWN memberships; managers read/write all.
DROP POLICY IF EXISTS "user_groups: read own or manager" ON user_groups;
CREATE POLICY "user_groups: read own or manager"
  ON user_groups FOR SELECT
  USING (user_id = auth.uid() OR has_permission('groups.manage'));

DROP POLICY IF EXISTS "user_groups: manager write" ON user_groups;
CREATE POLICY "user_groups: manager write"
  ON user_groups FOR ALL
  USING (has_permission('groups.manage'))
  WITH CHECK (has_permission('groups.manage'));

NOTIFY pgrst, 'reload schema';
