import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCron } from "@/lib/cron-auth";

// POST /api/cron/trust-scores
// Daily. Recomputes average_rating / dispute_rate / on_time_rate + badges
// for every seller. Per-review writes are still handled inline by the
// existing update_trust_score trigger; this job catches dispute/SLA
// changes that the trigger doesn't observe.
export async function POST(request: Request) {
  const unauth = verifyCron(request);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("recompute_all_trust_scores");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sellers_updated: data ?? 0 });
}

export const GET = POST;
