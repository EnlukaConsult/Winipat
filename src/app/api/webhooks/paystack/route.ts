import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  // Verify webhook signature
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  switch (event.event) {
    case "charge.success":
      await handleChargeSuccess(event.data);
      break;
    case "transfer.success":
      await handleTransferSuccess(event.data);
      break;
    case "transfer.failed":
      await handleTransferFailed(event.data);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleChargeSuccess(data: {
  reference: string;
  amount: number;
  metadata?: { order_id?: string };
}) {
  const reference = data.reference;
  const amountInKobo = data.amount;
  const orderId = data.metadata?.order_id;

  if (!orderId) return;

  // Update payment transaction
  await supabaseAdmin
    .from("payment_transactions")
    .update({
      status: "success",
      provider_reference: reference,
    })
    .eq("reference", reference);

  // Update order status to paid
  await supabaseAdmin
    .from("orders")
    .update({ status: "paid" })
    .eq("id", orderId);

  // Create order status history entry
  await supabaseAdmin.from("order_status_history").insert({
    order_id: orderId,
    status: "paid",
    notes: `Payment confirmed via Paystack. Reference: ${reference}`,
  });

  // Update escrow ledger to held
  await supabaseAdmin
    .from("escrow_ledger")
    .update({ status: "held" })
    .eq("order_id", orderId);

  // Notify seller
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("seller_id, order_number")
    .eq("id", orderId)
    .single();

  if (order) {
    await supabaseAdmin.from("notifications").insert({
      user_id: order.seller_id,
      title: "New Order Received",
      body: `Order ${order.order_number} has been paid. Please prepare the item.`,
      type: "order",
      data: { order_id: orderId },
    });
  }
}

async function handleTransferSuccess(data: { reference: string }) {
  await supabaseAdmin
    .from("payouts")
    .update({
      status: "completed",
      processed_at: new Date().toISOString(),
    })
    .eq("reference", data.reference);
}

async function handleTransferFailed(data: { reference: string }) {
  await supabaseAdmin
    .from("payouts")
    .update({ status: "failed" })
    .eq("reference", data.reference);
}
