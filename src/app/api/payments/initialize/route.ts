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

  // Multi-vendor checkout (Bug 2): a cart may produce several orders (one per
  // seller). They're paid together in ONE Paystack transaction. Accept an
  // orderIds array, or a single orderId for backward compatibility.
  const reqBody = await request.json();
  const orderIds: string[] = Array.isArray(reqBody.orderIds)
    ? reqBody.orderIds
    : reqBody.orderId
    ? [reqBody.orderId]
    : [];
  if (orderIds.length === 0) {
    return NextResponse.json({ error: "No order specified" }, { status: 400 });
  }

  // Fetch all orders in this checkout — must belong to the buyer and be unpaid.
  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select("id, total, order_number")
    .in("id", orderIds)
    .eq("buyer_id", user.id)
    .eq("status", "pending_payment");

  if (orderError || !orders || orders.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const grandTotal = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const confirmedIds = orders.map((o) => o.id);

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
  // Single order -> its detail page; multiple -> the orders list.
  const callbackUrl =
    orders.length === 1
      ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${confirmedIds[0]}?payment=callback`
      : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders?payment=callback`;

  // Write the payment_transactions + escrow_ledger rows with the SERVICE-ROLE
  // client. These tables have no buyer-insert RLS policy, so doing this with
  // the buyer's session silently failed — leaving the webhook with no
  // payment_transactions row to mark paid on charge.success. Service-role
  // bypasses RLS (same as the webhook).
  const admin = createAdminClient();

  // ONE payment_transactions row for the whole payment (reference is UNIQUE).
  // order_id is the first order; the full set lives in metadata.order_ids and
  // is what the webhook loops over to confirm every order.
  const { error: txError } = await admin.from("payment_transactions").insert({
    order_id: confirmedIds[0],
    reference,
    amount: grandTotal,
    currency: "NGN",
    status: "pending",
    provider: "paystack",
    metadata: { order_ids: confirmedIds },
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
  // One escrow_ledger row per order (each escrow = that order's total).
  // order_id is UNIQUE, so upsert+ignoreDuplicates makes a payment retry safe.
  const { error: escrowError } = await admin.from("escrow_ledger").upsert(
    orders.map((o) => ({
      order_id: o.id,
      amount: o.total,
      status: "initiated",
    })),
    { onConflict: "order_id", ignoreDuplicates: true }
  );
  if (escrowError) {
    return NextResponse.json(
      { error: "Could not set up escrow. Please try again." },
      { status: 500 }
    );
  }

  // Initialize ONE Paystack transaction for the combined total. metadata
  // carries every order id so the webhook can confirm them all.
  const result = await initializeTransaction({
    email: payerEmail,
    amount: grandTotal, // kobo
    reference,
    metadata: {
      order_ids: confirmedIds,
      order_id: confirmedIds[0],
      order_number: orders[0].order_number,
    },
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
