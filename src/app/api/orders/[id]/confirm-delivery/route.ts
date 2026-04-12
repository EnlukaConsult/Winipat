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

  // Verify order belongs to buyer and is in deliverable state
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .in("status", ["delivered", "in_transit"])
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found or cannot be confirmed" }, { status: 404 });
  }

  // Update order to completed
  await supabase
    .from("orders")
    .update({ status: "completed" })
    .eq("id", orderId);

  // Add status history
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    status: "completed",
    changed_by: user.id,
    notes: "Buyer confirmed delivery",
  });

  // Update escrow to release_eligible (will be released after hold period by cron)
  await supabase
    .from("escrow_ledger")
    .update({ status: "release_eligible" })
    .eq("order_id", orderId);

  // Notify seller
  await supabase.from("notifications").insert({
    user_id: order.seller_id,
    title: "Delivery Confirmed",
    body: `Buyer confirmed delivery for order ${order.order_number}. Payment will be released after hold period.`,
    type: "order",
    data: { order_id: orderId },
  });

  return NextResponse.json({ success: true });
}
