import { createClient } from "@/lib/supabase/server";
import { initializeTransaction } from "@/lib/paystack";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await request.json();

  // Fetch order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .eq("status", "pending_payment")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const reference = `WNP-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${orderId}?payment=callback`;

  // Create payment transaction record
  await supabase.from("payment_transactions").insert({
    order_id: orderId,
    reference,
    amount: order.total,
    currency: "NGN",
    status: "pending",
    provider: "paystack",
  });

  // Create escrow ledger entry
  await supabase.from("escrow_ledger").insert({
    order_id: orderId,
    amount: order.subtotal, // Product amount only (not logistics)
    status: "initiated",
  });

  // Initialize Paystack transaction
  const result = await initializeTransaction({
    email: user.email!,
    amount: order.total, // Already in kobo
    reference,
    metadata: { order_id: orderId, order_number: order.order_number },
    callbackUrl,
  });

  if (!result.status) {
    return NextResponse.json(
      { error: "Payment initialization failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    authorization_url: result.data.authorization_url,
    reference: result.data.reference,
  });
}
