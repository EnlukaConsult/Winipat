import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-guard";

// PATCH /api/admin/payouts/[id]
// body: { status: 'processing' | 'completed' | 'failed', reference?: string }
//
// Marks a payout row as processed (admin will paste the bank reference once
// the manual transfer is done). V1 has no automated Paystack Transfer wiring;
// admin processes payouts in batches.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id: payoutId } = await params;
  const { status, reference } = (await request.json()) as {
    status: "processing" | "completed" | "failed";
    reference?: string;
  };

  if (!["processing", "completed", "failed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = createAdminClient();

  const update: Record<string, unknown> = { status };
  if (reference) update.reference = reference;
  if (status === "completed" || status === "failed") {
    update.processed_at = new Date().toISOString();
  }

  const { data: payout, error } = await admin
    .from("payouts")
    .update(update)
    .eq("id", payoutId)
    .select("seller_id, amount, reference")
    .single();

  if (error || !payout) {
    return NextResponse.json({ error: error?.message ?? "not found" }, { status: 500 });
  }

  if (status === "completed") {
    await admin.from("notifications").insert({
      user_id: payout.seller_id,
      title: "Payout completed",
      body: `Your payout of NGN ${(payout.amount / 100).toLocaleString()} has been sent.`,
      type: "payment",
      data: { payout_id: payoutId, reference: payout.reference },
    });
  } else if (status === "failed") {
    await admin.from("notifications").insert({
      user_id: payout.seller_id,
      title: "Payout failed",
      body: `A payout of NGN ${(payout.amount / 100).toLocaleString()} failed to process. Support will reach out.`,
      type: "payment",
      data: { payout_id: payoutId },
    });
  }

  return NextResponse.json({ ok: true, status });
}
