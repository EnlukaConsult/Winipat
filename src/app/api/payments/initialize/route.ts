import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Paystack requires an email. Phone-OTP signups have no auth email
  // (user.email is null), so fall back to the profile email — which the
  // signup trigger always populates (a real address or a placeholder the
  // user can later replace). Without this, phone-signup buyers can't pay.
  let payerEmail = user.email ?? null;
  if (!payerEmail) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();
    payerEmail = profile?.email ?? null;
  }
  if (!payerEmail) {
    return NextResponse.json(
      { error: "No email on file. Add an email to your profile to pay." },
      { status: 400 }
    );
  }

  const reference = `WNP-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${orderId}?payment=callback`;

  // Write the payment_transactions + escrow_ledger rows with the SERVICE-ROLE
  // client. These tables have no buyer-insert RLS policy, so doing this with
  // the buyer's session silently failed — leaving the webhook with no
  // payment_transactions row to mark paid on charge.success. Service-role
  // bypasses RLS (same as the webhook).
  const admin = createAdminClient();

  // Payment transaction record — the webhook updates this by `reference`.
  const { error: txError } = await admin.from("payment_transactions").insert({
    order_id: orderId,
    reference,
    amount: order.total,
    currency: "NGN",
    status: "pending",
    provider: "paystack",
  });
  if (txError) {
    return NextResponse.json(
      { error: "Could not record the payment. Please try again." },
      { status: 500 }
    );
  }

  // Escrow ledger entry.
  //
  // amount = order.total (NOT subtotal). Schema comment on
  // escrow_ledger.amount says "always equals order total" — the whole
  // payment lands in escrow, including logistics. The release function
  // in migration 005 then routes the right portion to the seller, with
  // the rest accounted for separately (logistics is routed to the
  // courier via Paystack split / admin payout). Inserting subtotal
  // here meant the seller's eventual payout was computed against the
  // wrong base, undercounting any platform-wide reconciliation.
  //
  // escrow_ledger.order_id is UNIQUE, so a payment retry on the same order
  // must not 500 — upsert + ignoreDuplicates keeps the existing row.
  const { error: escrowError } = await admin.from("escrow_ledger").upsert(
    {
      order_id: orderId,
      amount: order.total,
      status: "initiated",
    },
    { onConflict: "order_id", ignoreDuplicates: true }
  );
  if (escrowError) {
    return NextResponse.json(
      { error: "Could not set up escrow. Please try again." },
      { status: 500 }
    );
  }

  // Initialize Paystack transaction
  const result = await initializeTransaction({
    email: payerEmail,
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
