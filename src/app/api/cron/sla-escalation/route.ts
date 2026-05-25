import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCron } from "@/lib/cron-auth";

// POST /api/cron/sla-escalation
// Every 30 min. Cancels unpaid orders past the accept window and
// notifies admins about sellers stalled on payment_confirmed /
// seller_preparing. Never auto-cancels paid orders — admin decides
// refunds.
export async function POST(request: Request) {
  const unauth = verifyCron(request);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("escalate_overdue_orders");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    ok: true,
    cancelled: row?.cancelled ?? 0,
    escalated: row?.escalated ?? 0,
  });
}

export const GET = POST;
