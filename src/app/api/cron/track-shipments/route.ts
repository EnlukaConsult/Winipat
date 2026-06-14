import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCron } from "@/lib/cron-auth";
import { isGigConfigured, trackShipments, mapGigStatus } from "@/lib/gig";

// POST /api/cron/track-shipments
//
// GIG has no status webhook, so we poll. Batches active GIG waybills through
// /track/multipleMobileShipment and advances the shipment (and, on delivery,
// feeds the existing delivery-confirmation -> escrow-release path).
//
// Safe to schedule before GIG is live: it no-ops until GIG_* env is set.
// The response-PARSING step is gated on TODO(confirm) — GIG's tracking
// response shape + status value set are still pending, so we don't write
// status updates until that's confirmed.
export async function POST(request: Request) {
  const unauth = verifyCron(request);
  if (unauth) return unauth;

  if (!isGigConfigured()) {
    return NextResponse.json({ ok: true, skipped: "gig_not_configured" });
  }

  const supabase = createAdminClient();

  // Active GIG shipments that aren't delivered yet.
  const { data: shipments, error } = await supabase
    .from("shipments")
    .select("id, gig_waybill, status")
    .not("gig_waybill", "is", null)
    .in("status", ["assigned", "picked_up", "in_transit"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const waybills = (shipments ?? [])
    .map((s) => s.gig_waybill as string)
    .filter(Boolean);
  if (waybills.length === 0) {
    return NextResponse.json({ ok: true, checked: 0 });
  }

  let tracking: { data: unknown };
  try {
    tracking = await trackShipments(waybills);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 502 }
    );
  }

  // TODO(confirm): map GIG's tracking response to per-waybill status and
  // apply updates. Pseudocode once the response shape is known:
  //
  //   for (const row of tracking.data.<list>) {
  //     const next = mapGigStatus(row.<StatusField>);
  //     if (!next) continue;
  //     await supabase.from("shipments")
  //       .update({ status: next, gig_status: row.<StatusField>, gig_synced_at: new Date().toISOString() })
  //       .eq("gig_waybill", row.<WaybillField>);
  //     // if next === 'delivered' -> trigger delivery confirmation / escrow release
  //   }
  //
  // Keep `mapGigStatus` referenced so this stays wired for the fill-in.
  void mapGigStatus;

  return NextResponse.json({
    ok: true,
    checked: waybills.length,
    note: "tracking fetched; status mapping pending GIG response-shape confirmation",
  });
}

export const GET = POST;
