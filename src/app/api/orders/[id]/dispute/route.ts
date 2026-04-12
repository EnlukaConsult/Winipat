import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reason, description } = await request.json();

  // Verify order belongs to buyer and is in disputable state
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .in("status", ["delivered", "completed"])
    .single();

  if (!order) {
    return NextResponse.json(
      { error: "Order not found or cannot be disputed" },
      { status: 404 }
    );
  }

  // Create dispute
  const { data: dispute, error } = await supabase
    .from("disputes")
    .insert({
      order_id: orderId,
      opened_by: user.id,
      reason,
      description,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !dispute) {
    return NextResponse.json(
      { error: "Failed to create dispute" },
      { status: 500 }
    );
  }

  // Update order status
  await supabase
    .from("orders")
    .update({ status: "dispute_opened" })
    .eq("id", orderId);

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    status: "dispute_opened",
    changed_by: user.id,
    notes: `Dispute opened: ${reason}`,
  });

  // Hold escrow funds
  await supabase
    .from("escrow_ledger")
    .update({ status: "disputed" })
    .eq("order_id", orderId);

  // Notify seller and admin
  await supabase.from("notifications").insert([
    {
      user_id: order.seller_id,
      title: "Dispute Opened",
      body: `A dispute has been opened for order ${order.order_number}. Please respond with evidence.`,
      type: "dispute",
      data: { order_id: orderId, dispute_id: dispute.id },
    },
  ]);

  return NextResponse.json({ disputeId: dispute.id });
}
