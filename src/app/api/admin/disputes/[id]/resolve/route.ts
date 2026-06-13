import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/admin-guard";
import { sendEmail, emails } from "@/lib/email";

// POST /api/admin/disputes/[id]/resolve
// body: { resolution: 'release_to_seller' | 'full_refund' | 'partial_refund',
//          refundAmount?: number /* kobo, required for partial */,
//          notes?: string }
//
// Effects:
//   release_to_seller -> dispute.status='resolved_seller', escrow.status='release_eligible'
//   full_refund       -> dispute.status='resolved_buyer',  escrow.status='refunded', refund row, order->refunded
//   partial_refund    -> dispute.status='resolved_partial', escrow.status='released' (net), refund row (amount), order->completed
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission("disputes.resolve");
  if (guard instanceof NextResponse) return guard;

  const { id: disputeId } = await params;
  const { resolution, refundAmount, notes } = (await request.json()) as {
    resolution: "release_to_seller" | "full_refund" | "partial_refund";
    refundAmount?: number;
    notes?: string;
  };

  if (!["release_to_seller", "full_refund", "partial_refund"].includes(resolution)) {
    return NextResponse.json({ error: "Invalid resolution" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch the dispute + linked order + escrow
  const { data: dispute } = await admin
    .from("disputes")
    .select("id, order_id, status, opened_by")
    .eq("id", disputeId)
    .single();
  if (!dispute) {
    return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  }
  if (dispute.status.startsWith("resolved")) {
    return NextResponse.json({ error: "Dispute already resolved" }, { status: 409 });
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, buyer_id, seller_id, subtotal, total, order_number")
    .eq("id", dispute.order_id)
    .single();
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: escrow } = await admin
    .from("escrow_ledger")
    .select("id, amount, status")
    .eq("order_id", order.id)
    .single();

  if (resolution === "partial_refund") {
    if (!refundAmount || refundAmount <= 0 || (escrow && refundAmount >= escrow.amount)) {
      return NextResponse.json(
        { error: "partial_refund requires a refundAmount in kobo less than escrow amount" },
        { status: 400 }
      );
    }
  }

  // Map to DB status
  const newDisputeStatus =
    resolution === "release_to_seller"
      ? "resolved_seller"
      : resolution === "full_refund"
      ? "resolved_buyer"
      : "resolved_partial";

  // Always close the dispute first
  const { error: dispErr } = await admin
    .from("disputes")
    .update({
      status: newDisputeStatus,
      admin_notes: notes ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", disputeId);
  if (dispErr) return NextResponse.json({ error: dispErr.message }, { status: 500 });

  if (resolution === "release_to_seller") {
    if (escrow) {
      await admin
        .from("escrow_ledger")
        .update({ status: "release_eligible" })
        .eq("id", escrow.id);
    }
    await admin.from("orders").update({ status: "completed" }).eq("id", order.id);
  } else if (resolution === "full_refund") {
    if (escrow) {
      await admin
        .from("escrow_ledger")
        .update({ status: "refunded" })
        .eq("id", escrow.id);
    }
    await admin.from("refunds").insert({
      order_id: order.id,
      amount: escrow?.amount ?? order.subtotal,
      reason: notes || "Dispute resolved in buyer favour",
      status: "approved",
    });
    await admin.from("orders").update({ status: "refunded" }).eq("id", order.id);
  } else {
    // partial_refund
    if (escrow) {
      await admin
        .from("escrow_ledger")
        .update({ status: "released" })
        .eq("id", escrow.id);
    }
    await admin.from("refunds").insert({
      order_id: order.id,
      amount: refundAmount,
      reason: notes || "Partial refund per dispute resolution",
      status: "approved",
    });
    await admin.from("orders").update({ status: "completed" }).eq("id", order.id);
  }

  // Notify both parties in-app
  await admin.from("notifications").insert([
    {
      user_id: order.buyer_id,
      title: `Dispute resolved (${newDisputeStatus.replace("resolved_", "")})`,
      body: `Your dispute on order ${order.order_number} has been resolved.`,
      type: "system",
      data: { order_id: order.id, dispute_id: disputeId, resolution },
    },
    {
      user_id: order.seller_id,
      title: `Dispute resolved (${newDisputeStatus.replace("resolved_", "")})`,
      body: `The dispute on order ${order.order_number} has been resolved.`,
      type: "system",
      data: { order_id: order.id, dispute_id: disputeId, resolution },
    },
  ]);

  // Email both parties — pull their emails via service-role
  const [{ data: buyerProfile }, { data: sellerWithProfile }] = await Promise.all([
    admin.from("profiles").select("full_name, email").eq("id", order.buyer_id).single(),
    admin
      .from("sellers")
      .select("profile:profiles!id(full_name, email)")
      .eq("id", order.seller_id)
      .single(),
  ]);
  const sellerProfile = Array.isArray(sellerWithProfile?.profile)
    ? sellerWithProfile.profile[0]
    : sellerWithProfile?.profile;

  const refundAmountNaira =
    resolution === "partial_refund" && refundAmount
      ? Math.round(refundAmount / 100)
      : undefined;

  await Promise.all([
    buyerProfile?.email
      ? sendEmail({
          to: buyerProfile.email,
          ...emails.disputeResolved({
            toName: buyerProfile.full_name || "there",
            orderNumber: order.order_number,
            resolution,
            refundAmountNaira,
            notes: notes ?? undefined,
            isBuyer: true,
          }),
        })
      : Promise.resolve(),
    sellerProfile?.email
      ? sendEmail({
          to: sellerProfile.email,
          ...emails.disputeResolved({
            toName: sellerProfile.full_name || "there",
            orderNumber: order.order_number,
            resolution,
            refundAmountNaira,
            notes: notes ?? undefined,
            isBuyer: false,
          }),
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true, status: newDisputeStatus });
}
