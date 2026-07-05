import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCron } from "@/lib/cron-auth";
import {
  isKwikConfigured,
  getTaskByRelationshipId,
  mapKwikStatus,
} from "@/lib/kwik";

// POST /api/cron/track-shipments
//
// Polls active Kwik shipments and advances the order so the buyer sees
// delivery progress (assigned -> picked_up -> in_transit -> delivered). On
// "delivered" the buyer still confirms receipt to complete + release escrow.
// No-ops until Kwik is configured.
export async function POST(request: Request) {
  const unauth = verifyCron(request);
  if (unauth) return unauth;

  if (!isKwikConfigured()) {
    return NextResponse.json({ ok: true, skipped: "kwik_not_configured" });
  }

  const supabase = createAdminClient();

  const { data: shipments, error } = await supabase
    .from("shipments")
    .select("id, order_id, kwik_job_id, status")
    .not("kwik_job_id", "is", null)
    .in("status", ["assigned", "picked_up", "in_transit"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!shipments?.length) return NextResponse.json({ ok: true, checked: 0 });

  let updated = 0;
  for (const sh of shipments) {
    try {
      const task = await getTaskByRelationshipId(sh.kwik_job_id as string);
      const orders = task.data?.orders ?? [];
      const pickup = orders.find((o) => o.job_type === 0);
      const del = orders.find((o) => o.job_type === 1);
      const next = mapKwikStatus(pickup?.job_status, del?.job_status);
      if (!next || next === sh.status) continue;

      await supabase
        .from("shipments")
        .update({
          status: next,
          kwik_status: String(del?.job_status ?? pickup?.job_status ?? ""),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sh.id);

      // Advance the order (forward-only — never touch delivered/completed/etc).
      if (next === "picked_up" || next === "in_transit" || next === "delivered") {
        await supabase
          .from("orders")
          .update({ status: next })
          .eq("id", sh.order_id)
          .in("status", ["awaiting_pickup", "picked_up", "in_transit"]);
      }
      updated++;
    } catch {
      // skip this shipment; try again next run
    }
  }

  return NextResponse.json({ ok: true, checked: shipments.length, updated });
}

export const GET = POST;
