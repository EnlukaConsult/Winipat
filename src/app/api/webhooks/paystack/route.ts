import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendEmail, emails } from "@/lib/email";

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

  // Update order status -> payment_confirmed (matches Postgres order_status enum)
  await supabaseAdmin
    .from("orders")
    .update({ status: "payment_confirmed" })
    .eq("id", orderId);

  // Create order status history entry (audit trail)
  await supabaseAdmin.from("order_status_history").insert({
    order_id: orderId,
    status: "payment_confirmed",
    notes: `Payment confirmed via Paystack. Reference: ${reference}`,
  });

  // Update escrow ledger to held
  await supabaseAdmin
    .from("escrow_ledger")
    .update({ status: "held" })
    .eq("order_id", orderId);

  // Pull rich order + party details for the email
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select(
      `seller_id, buyer_id, order_number, total,
       buyer:profiles!buyer_id(full_name, email),
       seller:sellers!seller_id(business_name, profile:profiles!id(full_name, email))`
    )
    .eq("id", orderId)
    .single();

  if (!order) return;

  const buyer = Array.isArray(order.buyer) ? order.buyer[0] : order.buyer;
  const sellerRow = Array.isArray(order.seller) ? order.seller[0] : order.seller;
  const sellerProfile = Array.isArray(sellerRow?.profile) ? sellerRow.profile[0] : sellerRow?.profile;

  // In-app notification for seller (kept alongside email — bell pings too)
  await supabaseAdmin.from("notifications").insert({
    user_id: order.seller_id,
    title: "New Order Received",
    body: `Order ${order.order_number} has been paid. Please prepare the item.`,
    type: "order",
    data: { order_id: orderId },
  });

  // Email both parties in parallel — fire-and-forget; payment is already
  // recorded so failed emails should never roll the transaction back.
  const totalNaira = (order.total ?? 0) / 100;
  await Promise.all([
    buyer?.email
      ? sendEmail({
          to: buyer.email,
          ...emails.orderPlaced({
            toName: buyer.full_name || "there",
            orderNumber: order.order_number,
            sellerName: sellerRow?.business_name || "the seller",
            totalNaira,
          }),
        })
      : Promise.resolve(),
    sellerProfile?.email
      ? sendEmail({
          to: sellerProfile.email,
          ...emails.newOrderForSeller({
            toName: sellerProfile.full_name || "there",
            orderNumber: order.order_number,
            buyerName: buyer?.full_name || "A buyer",
            totalNaira,
          }),
        })
      : Promise.resolve(),
  ]);
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
