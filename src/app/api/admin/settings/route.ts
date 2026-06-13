import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/admin-guard";

// GET  /api/admin/settings           -> { key: value, ... }
// PATCH /api/admin/settings { key, value }
//
// Backs the /admin/settings page. Keys come from platform_settings seeded by
// migration 004. Values are stored as TEXT; the consumer parses.
export async function GET() {
  const guard = await requirePermission("settings.manage");
  if (guard instanceof NextResponse) return guard;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("key, value, updated_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ settings: data ?? [] });
}

export async function PATCH(request: Request) {
  const guard = await requirePermission("settings.manage");
  if (guard instanceof NextResponse) return guard;

  const { key, value } = (await request.json()) as { key: string; value: string };
  if (!key || typeof value !== "string") {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
