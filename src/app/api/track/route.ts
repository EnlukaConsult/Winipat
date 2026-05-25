import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/track { orderNumber, email }
// Public guest-friendly order lookup. Requires BOTH the exact order
// number AND the buyer's email to prevent enumeration. Returns only
// non-sensitive status fields — no monetary amounts, no seller PII.
type Body = { orderNumber?: string; email?: string };

export async function POST(request: Request) {
  const { orderNumber, email } = (await request.json().catch(() => ({}))) as Body;

  if (!orderNumber?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "Order number and email are both required." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Look up the order, then confirm the email matches the buyer's profile.
  const { data: order } = await admin
    .from("orders")
    .select(
      `id, order_number, status, created_at, completed_at, accepted_at, ready_at,
       buyer:profiles!buyer_id(email),
       seller:sellers!seller_id(business_name)`
    )
    .ilike("order_number", orderNumber.trim())
    .maybeSingle();

  if (!order) {
    // Generic message — never reveal whether the order number exists
    return NextResponse.json(
      { error: "No matching order found. Check the order number and email." },
      { status: 404 }
    );
  }

  const buyer  = Array.isArray(order.buyer)  ? order.buyer[0]  : order.buyer;
  const seller = Array.isArray(order.seller) ? order.seller[0] : order.seller;

  if (!buyer?.email || buyer.email.toLowerCase() !== email.trim().toLowerCase()) {
    return NextResponse.json(
      { error: "No matching order found. Check the order number and email." },
      { status: 404 }
    );
  }

  // Pull the audit trail so the user sees the journey
  const { data: history } = await admin
    .from("order_status_history")
    .select("status, created_at, notes")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true })
    .limit(20);

  return NextResponse.json({
    order_number: order.order_number,
    seller:       seller?.business_name ?? "—",
    status:       order.status,
    created_at:   order.created_at,
    accepted_at:  order.accepted_at,
    ready_at:     order.ready_at,
    completed_at: order.completed_at,
    history:      history ?? [],
  });
}
