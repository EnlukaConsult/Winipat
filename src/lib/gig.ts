// GIG Logistics API client (server-only).
//
// CONFIRMED via live probe (2026-06-14):
//   - Base (test): https://dev-thirdpartynode.theagilitysystems.com
//   - POST /login { email, password } -> JSON envelope { message, apiId, status, data }
//   - Auth: send the token in the `authorization` (or `access-token`) header.
//
// PENDING from GIG (see docs/partner-integration-questions.md) — marked
// TODO(confirm) below:
//   - exact field holding the token in the /login response `data`
//   - request/response SCHEMAS for /price and /capture/preshipment
//   - the tracking status value set, and the billing model
//
// This file is import-safe without credentials: nothing runs at module load;
// callers get a clear error only if they actually invoke the API while
// GIG_* env vars are unset (see isGigConfigured / assertConfigured).

const BASE = process.env.GIG_BASE_URL ?? "";
const EMAIL = process.env.GIG_EMAIL ?? "";
const PASSWORD = process.env.GIG_PASSWORD ?? "";

export function isGigConfigured(): boolean {
  return Boolean(BASE && EMAIL && PASSWORD);
}

function assertConfigured() {
  if (!isGigConfigured()) {
    throw new Error(
      "GIG is not configured. Set GIG_BASE_URL, GIG_EMAIL, GIG_PASSWORD."
    );
  }
}

// GIG's standard response envelope.
type GigEnvelope<T = unknown> = {
  message: string;
  apiId: string;
  status: number;
  data: T;
};

// In-memory token cache (per serverless instance). GIG documents no refresh
// flow, so we simply re-login on a 401 (see gigFetch).
let cachedToken: string | null = null;

async function login(): Promise<string> {
  assertConfigured();
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = (await res.json().catch(() => ({}))) as GigEnvelope<
    Record<string, unknown>
  >;
  if (!res.ok) {
    throw new Error(`GIG login failed (${res.status}): ${body?.message ?? ""}`);
  }
  // TODO(confirm): exact token field in the login response. The envelope is
  // { message, apiId, status, data }; the token is expected inside `data`.
  // Probe common shapes until GIG confirms.
  const d = body.data ?? {};
  const token =
    (d.token as string) ||
    (d.access_token as string) ||
    (d.accessToken as string) ||
    ((d.user as Record<string, unknown> | undefined)?.token as string) ||
    "";
  if (!token) {
    throw new Error(
      "GIG login succeeded but no token field found in response.data — confirm the field name with GIG."
    );
  }
  cachedToken = token;
  return token;
}

// Authenticated request with one automatic re-login on 401.
async function gigFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<GigEnvelope<T>> {
  assertConfigured();
  const token = cachedToken ?? (await login());
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      // Confirmed: GIG accepts the token in `authorization` or `access-token`.
      authorization: token,
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401 && retry) {
    cachedToken = null;
    return gigFetch<T>(path, init, false);
  }

  const body = (await res.json().catch(() => ({}))) as GigEnvelope<T>;
  if (!res.ok) {
    throw new Error(`GIG ${path} failed (${res.status}): ${body?.message ?? ""}`);
  }
  return body;
}

// ---------------------------------------------------------------------------
// Reference data — geo/stations (used to map an address -> StationId).
// ---------------------------------------------------------------------------
export async function getLocalStations(): Promise<GigEnvelope<unknown>> {
  return gigFetch("/localstations/get", { method: "GET" });
}

// ---------------------------------------------------------------------------
// Pricing — get a delivery quote.
// TODO(confirm): full body schema. Known required keys from the docs:
//   SenderStationId, ReceiverStationId, SenderLocation, ReceiverLocation,
//   CustomerCode, CustomerType, PickUpOptions, ShipmentItems[].
// ---------------------------------------------------------------------------
export type GigPriceParams = Record<string, unknown>; // TODO(confirm) shape
export async function getPrice(
  params: GigPriceParams
): Promise<GigEnvelope<unknown>> {
  return gigFetch("/price", { method: "POST", body: JSON.stringify(params) });
}

// ---------------------------------------------------------------------------
// Shipment creation — returns a waybill (TODO(confirm) that it does).
// TODO(confirm): SenderDetails, ReceiverDetails, ShipmentDetails, ShipmentItems[].
// ---------------------------------------------------------------------------
export type GigShipmentParams = Record<string, unknown>; // TODO(confirm) shape
export async function createPreshipment(
  params: GigShipmentParams
): Promise<GigEnvelope<unknown>> {
  return gigFetch("/capture/preshipment", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ---------------------------------------------------------------------------
// Tracking — poll-only (no webhook documented). Batch up to many waybills.
// ---------------------------------------------------------------------------
export async function trackShipments(
  waybills: string[],
  fetchOption = 1
): Promise<GigEnvelope<unknown>> {
  return gigFetch("/track/multipleMobileShipment", {
    method: "POST",
    body: JSON.stringify({ Waybill: waybills, fetchOption }),
  });
}

// Map a raw GIG tracking status to our shipment_status enum
// ('assigned' | 'picked_up' | 'in_transit' | 'delivered').
// TODO(confirm): GIG's actual status value set — fill this mapping once known.
export function mapGigStatus(
  raw: string
): "assigned" | "picked_up" | "in_transit" | "delivered" | null {
  const s = (raw || "").toLowerCase();
  if (s.includes("deliver")) return "delivered";
  if (s.includes("transit") || s.includes("shipped")) return "in_transit";
  if (s.includes("pick")) return "picked_up";
  if (s.includes("assign") || s.includes("process")) return "assigned";
  return null; // unknown -> leave unchanged until mapping confirmed
}
