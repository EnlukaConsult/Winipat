// Address -> coordinates (server-only).
//
// Kwik requires lat/long for pickup + delivery, but Winipat stores text
// addresses. Uses Google Geocoding when GOOGLE_MAPS_API_KEY is set (best
// accuracy), otherwise falls back to the free, no-key OpenStreetMap Nominatim
// geocoder. Returns null on any failure so callers fall back to the flat fee.
//
// Coordinates are cached on addresses/sellers by the caller, so Nominatim's
// ~1 req/sec limit is not a problem in practice. Biased to Nigeria.

const KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

export type Coords = { lat: number; lng: number };

// Geocoding is always available (Nominatim needs no key); Google is used when
// a key is present.
export function isGeocodingConfigured(): boolean {
  return true;
}

async function geocodeGoogle(address: string): Promise<Coords | null> {
  try {
    const url =
      "https://maps.googleapis.com/maps/api/geocode/json" +
      `?address=${encodeURIComponent(address)}&region=ng&key=${KEY}`;
    const res = await fetch(url);
    const j = (await res.json()) as {
      status?: string;
      results?: { geometry?: { location?: Coords } }[];
    };
    const loc = j.results?.[0]?.geometry?.location;
    if (j.status === "OK" && loc) return { lat: loc.lat, lng: loc.lng };
    return null;
  } catch {
    return null;
  }
}

async function geocodeNominatim(address: string): Promise<Coords | null> {
  try {
    const url =
      "https://nominatim.openstreetmap.org/search" +
      `?format=json&limit=1&countrycodes=ng&q=${encodeURIComponent(address)}`;
    // Nominatim usage policy requires an identifying User-Agent.
    const res = await fetch(url, {
      headers: { "User-Agent": "Winipat/1.0 (https://winipat.com)" },
    });
    const j = (await res.json()) as { lat?: string; lon?: string }[];
    const first = Array.isArray(j) ? j[0] : null;
    if (first?.lat && first?.lon) {
      return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<Coords | null> {
  if (!address?.trim()) return null;
  if (KEY) {
    const g = await geocodeGoogle(address);
    if (g) return g;
    // fall through to Nominatim if Google returned nothing
  }
  return geocodeNominatim(address);
}
