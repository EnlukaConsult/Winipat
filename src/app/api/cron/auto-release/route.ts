import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCron } from "@/lib/cron-auth";

// POST /api/cron/auto-release
// Runs hourly. Releases escrow rows that have been release_eligible past
// the platform hold window, and creates pending payout rows for sellers
// with a primary bank account. Returns counters for observability.
export async function POST(request: Request) {
  const unauth = verifyCron(request);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("auto_release_escrows");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    ok: true,
    released: row?.released_count ?? 0,
    payouts_created: row?.payouts_created ?? 0,
  });
}

export const GET = POST;
