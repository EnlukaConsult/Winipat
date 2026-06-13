import { createClient } from "@/lib/supabase/server";

// Server-side permission helpers backed by the SECURITY DEFINER SQL
// functions from migration 015 (`my_permissions()` / `has_permission()`).
// A user's effective permissions = the union across all their security
// groups. Use these in server components to gate UI; use requirePermission
// (admin-guard.ts) to gate API routes.

// All permission keys the current user holds. Empty array if signed out.
export async function getMyPermissions(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_permissions");
  if (error || !data) return [];
  return data as string[];
}

// True if the current user holds `perm`.
export async function hasPermission(perm: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_permission", { perm });
  if (error) return false;
  return data === true;
}

// Convenience set wrapper for checking many keys cheaply in one component.
export async function getPermissionSet(): Promise<Set<string>> {
  return new Set(await getMyPermissions());
}
