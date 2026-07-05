import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isKwikConfigured, calculatePricing, type KwikStop } from "@/lib/kwik";
import { geocodeAddress } from "@/lib/geocode";

// POST /api/logistics/quote  { deliveryAddressId, logisticsPartnerId, items }
//
// Returns the delivery fee for checkout. Uses live Kwik pricing when possible
// (geocode seller pickup + buyer address -> Kwik /send_payment_for_task),
// summed across sellers for a mixed cart. Falls back to the manual flat fee on
// any failure (Kwik not configured, address can't be geocoded, Kwik error) so
// checkout never breaks. Geocoded coordinates are cached on addresses/sellers.
//
// Returns: { source: "kwik" | "manual", amount_kobo, currency, note? }

const DEFAULT_FEE_KOBO = 250000; // ₦2,500

// Try full address, then city+state, then state, until one geocodes.
async function geocodeParts(p: {
  line?: string | null;
  city?: string | null;
  state?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const candidates: string[] = [];
  if (p.line && p.city && p.state) candidates.push(`${p.line}, ${p.city}, ${p.state}, Nigeria`);
  if (p.city && p.state) candidates.push(`${p.city}, ${p.state}, Nigeria`);
  if (p.state) candidates.push(`${p.state}, Nigeria`);
  for (const c of candidates) {
    const r = await geocodeAddress(c);
    if (r) return r;
  }
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deliveryAddressId, logisticsPartnerId, items } = (await request
    .json()
    .catch(() => ({}))) as {
    deliveryAddressId?: string;
    logisticsPartnerId?: string;
    items?: { productId: string; quantity: number }[];
  };

  const admin = createAdminClient();

  async function manualQuote(note?: string) {
    let feeKobo = DEFAULT_FEE_KOBO;
    if (logisticsPartnerId) {
      const { data: p } = await admin
        .from("logistics_partners")
        .select("delivery_fee_kobo")
        .eq("id", logisticsPartnerId)
        .maybeSingle();
      if (p?.delivery_fee_kobo != null) feeKobo = p.delivery_fee_kobo as number;
    }
    return NextResponse.json({
      source: "manual",
      amount_kobo: feeKobo,
      currency: "NGN",
      ...(note ? { note } : {}),
    });
  }

  if (!isKwikConfigured() || !deliveryAddressId || !items?.length) {
    return manualQuote();
  }

  // --- Buyer delivery coordinates (cached on the address) ---
  const { data: addr } = await admin
    .from("addresses")
    .select("id, street, city, state, latitude, longitude")
    .eq("id", deliveryAddressId)
    .maybeSingle();
  if (!addr) return manualQuote("no delivery address");

  let dLat = addr.latitude as number | null;
  let dLng = addr.longitude as number | null;
  if (dLat == null || dLng == null) {
    const c = await geocodeParts({ line: addr.street, city: addr.city, state: addr.state });
    if (!c) return manualQuote("buyer address not geocoded");
    dLat = c.lat;
    dLng = c.lng;
    await admin.from("addresses").update({ latitude: dLat, longitude: dLng }).eq("id", addr.id);
  }

  const { data: buyer } = await admin
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single();

  // --- Sellers in this cart ---
  const productIds = items.map((i) => i.productId);
  const { data: products } = await admin
    .from("products")
    .select("seller_id")
    .in("id", productIds);
  const sellerIds = [...new Set((products ?? []).map((p) => p.seller_id))];
  if (sellerIds.length === 0) return manualQuote();

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const delivery: KwikStop = {
    address: [addr.street, addr.city, addr.state].filter(Boolean).join(", "),
    name: buyer?.full_name ?? "Buyer",
    latitude: dLat,
    longitude: dLng,
    time: now,
    phone: buyer?.phone ?? "+2340000000000",
  };

  // One Kwik task per seller (each ships separately) -> sum the prices.
  let totalNaira = 0;
  for (const sellerId of sellerIds) {
    const { data: seller } = await admin
      .from("sellers")
      .select("business_name, pickup_address, pickup_city, pickup_state, pickup_latitude, pickup_longitude")
      .eq("id", sellerId)
      .maybeSingle();
    if (!seller) return manualQuote("seller missing");

    let sLat = seller.pickup_latitude as number | null;
    let sLng = seller.pickup_longitude as number | null;
    if (sLat == null || sLng == null) {
      const c = await geocodeParts({
        line: seller.pickup_address,
        city: seller.pickup_city,
        state: seller.pickup_state,
      });
      if (!c) return manualQuote("seller pickup not geocoded");
      sLat = c.lat;
      sLng = c.lng;
      await admin
        .from("sellers")
        .update({ pickup_latitude: sLat, pickup_longitude: sLng })
        .eq("id", sellerId);
    }

    const { data: sellerProfile } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", sellerId)
      .single();

    const pickup: KwikStop = {
      address:
        seller.pickup_address ||
        [seller.pickup_city, seller.pickup_state].filter(Boolean).join(", "),
      name: seller.business_name ?? "Seller",
      latitude: sLat,
      longitude: sLng,
      time: now,
      phone: sellerProfile?.phone ?? "+2340000000000",
      email: "",
    };

    try {
      const res = await calculatePricing(pickup, delivery);
      const cost = parseFloat(res.data?.per_task_cost ?? "");
      if (!isFinite(cost) || cost <= 0) return manualQuote("kwik: no price returned");
      totalNaira += cost;
    } catch (e) {
      return manualQuote(`kwik: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    source: "kwik",
    amount_kobo: Math.round(totalNaira * 100),
    currency: "NGN",
  });
}
