import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/conversations { sellerId, orderId? }
// Finds or creates a conversation between the authed buyer and the
// given seller (optionally scoped to an order). Returns { id }.
//
// The conversations table has a unique constraint on
// (buyer_id, seller_id, order_id) so an upsert with onConflict
// guarantees idempotency.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sellerId, orderId } = (await request.json()) as {
    sellerId: string;
    orderId?: string | null;
  };

  if (!sellerId) {
    return NextResponse.json({ error: "sellerId required" }, { status: 400 });
  }
  if (sellerId === user.id) {
    return NextResponse.json(
      { error: "Cannot message yourself" },
      { status: 400 }
    );
  }

  // Try existing first (UNIQUE constraint includes order_id, which may be NULL;
  // PostgREST .or() handles the lookup either way)
  const findQuery = supabase
    .from("conversations")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("seller_id", sellerId);

  const { data: existing } = orderId
    ? await findQuery.eq("order_id", orderId).maybeSingle()
    : await findQuery.is("order_id", null).maybeSingle();

  if (existing) {
    return NextResponse.json({ id: existing.id, created: false });
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      buyer_id: user.id,
      seller_id: sellerId,
      order_id: orderId ?? null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: error?.message || "Failed to create conversation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: created.id, created: true });
}
