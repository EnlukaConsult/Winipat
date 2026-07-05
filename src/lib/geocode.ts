// Address -> coordinates via Google Geocoding (server-only).
//
// Kwik requires lat/long for pickup + delivery, but Winipat stores text
// addresses. This resolves them (biased to Nigeria) and returns null on any
// failure so callers can fall back to the manual flat delivery fee.
//
// Needs GOOGLE_MAPS_API_KEY. Import-safe; returns null when unset.

const KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

export function isGeocodingConfigured(): boolean {
  return Boolean(KEY);
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  if (!KEY || !address?.trim()) return null;
  try {
    const url =
      "https://maps.googleapis.com/maps/api/geocode/json" +
      `?address=${encodeURIComponent(address)}&region=ng&key=${KEY}`;
    const res = await fetch(url);
    const j = (await res.json()) as {
      status?: string;
      results?: { geometry?: { location?: { lat: number; lng: number } } }[];
    };
    const loc = j.results?.[0]?.geometry?.location;
    if (j.status === "OK" && loc) return { lat: loc.lat, lng: loc.lng };
    return null;
  } catch {
    return null;
  }
}
