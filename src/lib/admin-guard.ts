import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Verifies the caller is signed in AND has profiles.role = 'admin'.
// Returns { user } when allowed, or a NextResponse to return immediately.
export async function requireAdmin(): Promise<
  | { user: { id: string; email: string } }
  | NextResponse
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { user: { id: user.id, email: user.email ?? "" } };
}

// Verifies the caller is signed in AND holds the given permission via one of
// their security groups (migration 015). Returns { user } when allowed, or a
// NextResponse to return immediately. This is the granular replacement for
// requireAdmin — prefer it for new admin routes so access is governed by
// security groups rather than the all-or-nothing role flag.
export async function requirePermission(
  perm: string
): Promise<{ user: { id: string; email: string } } | NextResponse> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("has_permission", { perm });

  if (error || data !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { user: { id: user.id, email: user.email ?? "" } };
}
