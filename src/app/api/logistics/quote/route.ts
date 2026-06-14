import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isGigConfigured, getPrice } from "@/lib/gig";

// POST /api/logistics/quote  { deliveryAddressId, logisticsPartnerId, items? }
//
// Returns a delivery fee for checkout. TODAY it returns the manual flat fee
// (current behaviour, unchanged), so this route is safe to ship now. Once GIG
// is live (creds + confirmed /price schema), the GIG branch returns a live
// quote and we point checkout at this route instead of the hard-coded fee.
//
// Returns: { source: "gig" | "manual", amount_kobo, currency, quote_ref?, note? }

const DEFAULT_FEE_KOBO = 250000; // ₦2,500 — matches checkout's fallback

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deliveryAddressId, logisticsPartnerId } = (await request
    .json()
    .catch(() => ({}))) as {
    deliveryAddressId?: string;
    logisticsPartnerId?: string;
    items?: { productId: string; quantity: number }[];
  };

  // Manual flat-fee quote (current behaviour + safe fallback).
  async function manualQuote(note?: string) {
    let feeKobo = DEFAULT_FEE_KOBO;
    if (logisticsPartnerId) {
      const { data: p } = await supabase
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

  if (!isGigConfigured()) return manualQuote();

  // --- GIG live-quote branch (scaffold) ---
  // Resolve the receiver station from the buyer's delivery-address state.
  let receiverStationId: string | null = null;
  if (deliveryAddressId) {
    const { data: addr } = await supabase
      .from("addresses")
      .select("state")
      .eq("id", deliveryAddressId)
      .maybeSingle();
    if (addr?.state) {
      const { data: st } = await supabase
        .from("gig_stations")
        .select("gig_station_id")
        .eq("state_name", addr.state)
        .limit(1)
        .maybeSingle();
      receiverStationId = (st?.gig_station_id as string) ?? null;
    }
  }

  // TODO(confirm): resolve the SENDER station from the seller's pickup address
  // (sellers.pickup_state -> gig_stations). Needs the order's seller, derived
  // from `items` -> products.seller_id -> sellers.pickup_state.
  const senderStationId: string | null = null;

  if (!receiverStationId || !senderStationId) {
    return manualQuote("gig: station unresolved, used manual fee");
  }

  // TODO(confirm): GIG /price request schema and how to read the fee + a quote
  // reference from the response. Until confirmed, return the manual fee so
  // checkout never breaks.
  try {
    const res = await getPrice({
      SenderStationId: senderStationId,
      ReceiverStationId: receiverStationId,
      // SenderLocation, ReceiverLocation, CustomerCode, CustomerType,
      // PickUpOptions, ShipmentItems[] -> TODO(confirm)
    });
    void res; // TODO(confirm): const amount_kobo = ...; const quote_ref = ...;
    return manualQuote("gig: quote fetched, parsing pending schema confirmation");
  } catch (e) {
    return manualQuote(`gig: quote failed (${(e as Error).message}), used manual fee`);
  }
}
