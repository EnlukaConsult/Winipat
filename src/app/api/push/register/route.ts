import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// POST /api/push/register   { token, platform }
//
// Stores a device's APNs/FCM push token for the logged-in user. Called by the
// native app after the OS grants push permission. Idempotent — upserts on the
// token so re-registration (or a device changing hands) just re-points it.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token, platform } = (await request.json().catch(() => ({}))) as {
    token?: string;
    platform?: string;
  };
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const plat = platform === "ios" || platform === "android" ? platform : "web";

  const admin = createAdminClient();
  const { error } = await admin
    .from("device_tokens")
    .upsert(
      { user_id: user.id, token, platform: plat, updated_at: new Date().toISOString() },
      { onConflict: "token" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/push/register  { token } — unregister on logout.
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = (await request.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("device_tokens").delete().eq("token", token).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
