import { NextResponse } from "next/server";
import { isKwikConfigured, calculatePricing, type KwikStop } from "@/lib/kwik";
import { geocodeStructured } from "@/lib/geocode";

// GET /api/logistics/diag
//
// Temporary, unauthenticated diagnostics for the Kwik live-rate pipeline.
// Returns booleans + live check results only — NEVER secret values — so we can
// tell from production whether the flat-rate fallback is due to missing env,
// a Kwik login failure, geocoding, or the price call. Remove once resolved.
export async function GET() {
  const env = {
    KWIK_BASE_URL: Boolean(process.env.KWIK_BASE_URL),
    KWIK_DOMAIN: Boolean(process.env.KWIK_DOMAIN),
    KWIK_EMAIL: Boolean(process.env.KWIK_EMAIL),
    KWIK_PASSWORD: Boolean(process.env.KWIK_PASSWORD),
    configured: isKwikConfigured(),
  };

  const out: Record<string, unknown> = { env };

  // Geocode check (Nominatim from the serverless region).
  try {
    const g = await geocodeStructured({ line: null, city: "Ikeja", state: "Lagos" });
    out.geocode = { ok: Boolean(g), coords: g };
  } catch (e) {
    out.geocode = { ok: false, error: (e as Error).message };
  }

  // Live Kwik login + price check (only if configured).
  if (env.configured) {
    try {
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      const pickup: KwikStop = {
        address: "Ikeja, Lagos",
        name: "Seller",
        latitude: 6.6018,
        longitude: 3.3515,
        time: now,
        phone: "+2348000000000",
        email: "",
      };
      const delivery: KwikStop = {
        address: "Lekki, Lagos",
        name: "Buyer",
        latitude: 6.4698,
        longitude: 3.5852,
        time: now,
        phone: "+2348000000001",
      };
      const priced = await calculatePricing(pickup, delivery);
      out.kwik = {
        ok: true,
        per_task_cost: priced.data?.per_task_cost ?? null,
        message: priced.message,
      };
    } catch (e) {
      out.kwik = { ok: false, error: (e as Error).message };
    }
  } else {
    out.kwik = { ok: false, error: "not configured" };
  }

  return NextResponse.json(out);
}
