import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  isKwikConfigured,
  calculatePricing,
  createTask,
  type KwikStop,
} from "@/lib/kwik";
import { geocodeStructured } from "@/lib/geocode";

// POST /api/logistics/dispatch  { orderId }
//
// Creates a Kwik delivery task (pickup = seller, delivery = buyer) and stores a
// shipments row so the tracking cron can advance the order. Called by the
// seller when marking an order Ready — best-effort: any failure returns
// { ok: false } and leaves the order in the manual flow (never blocks).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = (await request.json().catch(() => ({}))) as { orderId?: string };
  if (!orderId) return NextResponse.json({ ok: false, reason: "no order" }, { status: 400 });

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, seller_id, buyer_id, status, delivery_address_id, logistics_partner_id")
    .eq("id", orderId)
    .maybeSingle();

  // Only the order's seller can dispatch it, and only once it's ready.
  if (!order || order.seller_id !== user.id) {
    return NextResponse.json({ ok: false, reason: "not your order" }, { status: 403 });
  }
  if (!isKwikConfigured()) {
    return NextResponse.json({ ok: false, reason: "kwik_not_configured" });
  }

  // Idempotency — don't dispatch twice.
  const { data: existing } = await admin
    .from("shipments")
    .select("id, kwik_job_id")
    .eq("order_id", orderId)
    .not("kwik_job_id", "is", null)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, already: true });

  // --- Resolve coordinates (cache on address/seller) ---
  const { data: addr } = order.delivery_address_id
    ? await admin
        .from("addresses")
        .select("id, street, city, state, latitude, longitude")
        .eq("id", order.delivery_address_id)
        .maybeSingle()
    : { data: null };
  if (!addr) return NextResponse.json({ ok: false, reason: "no delivery address" });

  let dLat = addr.latitude as number | null;
  let dLng = addr.longitude as number | null;
  if (dLat == null || dLng == null) {
    const c = await geocodeStructured({ line: addr.street, city: addr.city, state: addr.state });
    if (!c) return NextResponse.json({ ok: false, reason: "buyer not geocoded" });
    dLat = c.lat;
    dLng = c.lng;
    await admin.from("addresses").update({ latitude: dLat, longitude: dLng }).eq("id", addr.id);
  }

  const { data: seller } = await admin
    .from("sellers")
    .select("business_name, pickup_address, pickup_city, pickup_state, pickup_latitude, pickup_longitude")
    .eq("id", order.seller_id)
    .maybeSingle();
  if (!seller) return NextResponse.json({ ok: false, reason: "no seller" });

  let sLat = seller.pickup_latitude as number | null;
  let sLng = seller.pickup_longitude as number | null;
  if (sLat == null || sLng == null) {
    const c = await geocodeStructured({
      line: seller.pickup_address,
      city: seller.pickup_city,
      state: seller.pickup_state,
    });
    if (!c) return NextResponse.json({ ok: false, reason: "seller not geocoded" });
    sLat = c.lat;
    sLng = c.lng;
    await admin
      .from("sellers")
      .update({ pickup_latitude: sLat, pickup_longitude: sLng })
      .eq("id", order.seller_id);
  }

  const [{ data: buyerP }, { data: sellerP }] = await Promise.all([
    admin.from("profiles").select("full_name, phone").eq("id", order.buyer_id).single(),
    admin.from("profiles").select("phone").eq("id", order.seller_id).single(),
  ]);

  const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19);
  const pickup: KwikStop = {
    address: seller.pickup_address || [seller.pickup_city, seller.pickup_state].filter(Boolean).join(", "),
    name: seller.business_name ?? "Seller",
    latitude: sLat,
    longitude: sLng,
    time: nowStr,
    phone: sellerP?.phone ?? "+2340000000000",
    email: "",
  };
  const delivery: KwikStop = {
    address: [addr.street, addr.city, addr.state].filter(Boolean).join(", "),
    name: buyerP?.full_name ?? "Buyer",
    latitude: dLat,
    longitude: dLng,
    time: nowStr,
    phone: buyerP?.phone ?? "+2340000000000",
  };

  try {
    const priced = await calculatePricing(pickup, delivery);
    const amount = priced.data?.per_task_cost;
    if (!amount) return NextResponse.json({ ok: false, reason: "no price" });

    const task = await createTask(pickup, delivery, amount);
    const uniqueOrderId = task.data?.unique_order_id;
    if (!uniqueOrderId) return NextResponse.json({ ok: false, reason: "no unique_order_id" });
    const jobToken = task.data?.deliveries?.[0]?.job_token ?? null;

    // shipments.logistics_partner_id is NOT NULL — use the order's partner,
    // else the Kwik partner row, else any active partner.
    let partnerId = order.logistics_partner_id as string | null;
    if (!partnerId) {
      const { data: kp } = await admin
        .from("logistics_partners")
        .select("id")
        .eq("api_provider", "kwik")
        .limit(1)
        .maybeSingle();
      partnerId =
        kp?.id ??
        (
          await admin
            .from("logistics_partners")
            .select("id")
            .eq("is_active", true)
            .limit(1)
            .maybeSingle()
        ).data?.id ??
        null;
    }
    if (!partnerId) return NextResponse.json({ ok: false, reason: "no logistics partner" });

    await admin.from("shipments").insert({
      order_id: orderId,
      logistics_partner_id: partnerId,
      tracking_number: uniqueOrderId,
      kwik_job_id: uniqueOrderId, // the relationship id used for tracking
      kwik_job_token: jobToken,
      kwik_status: "created",
      status: "assigned",
    });

    return NextResponse.json({ ok: true, unique_order_id: uniqueOrderId });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: (e as Error).message });
  }
}
