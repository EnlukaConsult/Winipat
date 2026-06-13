# Winipat RBAC / Security Groups — Design v1

_Status: approved 2026-06-13. Implementation in progress._

## 1. Core model

Every capability flows from **group membership**. A user's effective permissions =
the **union of permissions across all groups they belong to**.

```
permissions ──< group_permissions >── security_groups ──< user_groups >── profiles
 (catalog)                              (named groups)                    (users)
```

`profiles.role` (the `user_role` enum) is **retained as a "primary persona"** — it only
drives landing/routing and which **default group** a user auto-joins. All *permissions*
come from groups. The enum is not dropped (it is woven through routing, the signup
trigger, and ~dozens of RLS policies); keeping it as a thin denormalized persona tag
gives unified, group-driven *permissions* with minimal blast radius. It can be removed
later once every policy references groups.

## 2. Tables (migration `015_security_groups.sql`)

| Table | Purpose | Key columns |
|---|---|---|
| `permissions` | Atomic permission catalog | `key` (PK), `description`, `category` |
| `security_groups` | Named groups | `id`, `slug` (unique), `name`, `description`, `is_system`, `primary_persona` (nullable `user_role`) |
| `group_permissions` | group → permissions (M:N) | `group_id`, `permission_key` |
| `user_groups` | user → groups (M:N) | `user_id`, `group_id`, `assigned_by`, `assigned_at` |

## 3. Permission catalog (seeded)

- **admin:** `admin.access`, `disputes.view/resolve`, `payouts.view/approve`,
  `settlements.view`, `sellers.view/approve`, `products.moderate`, `enquiries.manage`,
  `analytics.view`, `settings.manage`, `team.manage`, `groups.manage`
- **seller:** `seller.access`, `products.list`, `products.bulk_upload`,
  `seller.earnings.view`, `seller.disputes.respond`
- **buyer:** `buyer.access`, `marketplace.buy`, `orders.manage`, `messages.use`
- **logistics:** `logistics.access`, `pickups.manage`, `deliveries.manage`

## 4. Seeded groups

- **`super-admin`** (system, persona = NULL) — every permission incl. `groups.manage`. Assigned explicitly.
- **`default-admin`** (system, persona = admin) — only `admin.access` (portal access, nothing else).
- Granular staff groups (deletable): **`dispute-managers`**, **`payout-approvers`**,
  **`kyc-reviewers`**, **`support-agents`**, **`read-only-analyst`**.
- Default persona groups (system): **`default-seller`**, **`default-buyer`**, **`default-logistics`**.

A "business user" = `role='admin'` (lands on `/admin`, gets `default-admin`) + one or
more granular staff groups. Existing admins are backfilled into `super-admin` so nobody
is locked out.

## 5. Auto-assignment "once they sign in"

A trigger on `profiles` (AFTER INSERT OR UPDATE OF `role`) ensures the user is a member
of their persona's **default group** (`primary_persona = NEW.role`), swapping it if the
role changes. Fires at signup (inside the profile insert) so it is automatic and
unskippable. Non-persona groups (staff groups) are never touched by the trigger.

## 6. Server-side enforcement

**SQL helper** (the backbone, mirrors the existing `is_admin()` pattern):

```sql
has_permission(perm TEXT) RETURNS BOOLEAN  -- STABLE, SECURITY DEFINER
-- true if auth.uid() has `perm` via any of their groups
```

1. **RLS** — sensitive policies move from `role = 'admin'` → `has_permission('...')` (migration `016`, after app code ships, so no mid-deploy lockout).
2. **API routes** — `requirePermission('payouts.approve')` guard at the top of each `/api/admin/*` route → 403 if missing.
3. **Pages/UI** — `getMyPermissions()` server util to hide/disable controls (UX only; RLS + API are the real gates).

## 7. Privilege-escalation guards

- Only `groups.manage` holders can CRUD groups/memberships (enforced in RLS *and* API).
- `super-admin` + default groups are `is_system` → undeletable; super-admin's perms are locked.
- Existing signup clamp stays: self-signup can only be `buyer`/`seller`.

## 8. Admin UI

- **`/admin/groups`** — group list (name, member count, system badge), create.
- **`/admin/groups/[id]`** — permission matrix (catalog by category) + member add/remove.
- Nav entry gated by `groups.manage`.

## 9. Rollout order (avoids lockout)

1. `015`: tables + helpers + catalog + groups + backfill + auto-assign trigger.
2. App code: permission utils, admin Groups UI, API guards.
3. `016`: flip RLS policies `role='admin'` → `has_permission(...)`.
