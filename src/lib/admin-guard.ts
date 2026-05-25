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
