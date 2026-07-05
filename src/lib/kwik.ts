// Kwik Delivery API client (server-only).
//
// CONFIRMED live against staging 2026-07:
//   POST /vendor_login { domain_name, email, password, api_login: 1 }
//     -> { message, status, data: { access_token, vendor_details: { vendor_id, ... } } }
//   Every other call takes access_token + domain_name (+ vendor_id for writes).
//   Currency in responses is NGN; prices are in NAIRA (e.g. per_task_cost "1474.5").
//
// See docs/kwik-integration-plan.md. Import-safe without credentials — a call
// only throws if invoked while KWIK_* is unset.

// Defensive: take only the first line and trim. Guards against a whole .env
// block being pasted into a single dashboard field (a real prod incident — the
// stray newlines made fetch() reject the URL and every quote fell back to flat).
const clean = (v: string | undefined) => (v ?? "").split(/[\r\n]/)[0].trim();

const BASE = clean(process.env.KWIK_BASE_URL).replace(/\/+$/, "");
const DOMAIN = clean(process.env.KWIK_DOMAIN);
const EMAIL = clean(process.env.KWIK_EMAIL);
const PASSWORD = clean(process.env.KWIK_PASSWORD);

// Nigeria (WAT, UTC+1). Kwik's `timezone` is JS getTimezoneOffset()-style
// (minutes, negative of the UTC offset) — WAT is -60.
const TIMEZONE = -60;

export function isKwikConfigured(): boolean {
  return Boolean(BASE && DOMAIN && EMAIL && PASSWORD);
}

function assertConfigured() {
  if (!isKwikConfigured()) {
    throw new Error(
      "Kwik is not configured. Set KWIK_BASE_URL, KWIK_DOMAIN, KWIK_EMAIL, KWIK_PASSWORD."
    );
  }
}

type KwikEnvelope<T = unknown> = { message: string; status: number; data: T };

// A pickup/delivery stop. Kwik needs coordinates (see src/lib/geocode.ts).
export type KwikStop = {
  address: string;
  name: string;
  latitude: number;
  longitude: number;
  time: string; // "YYYY-MM-DD HH:mm:ss"
  phone: string;
  email?: string;
};

// In-memory session (per serverless instance). No refresh flow documented, so
// we re-login on an auth failure.
let session: { access_token: string; vendor_id: number } | null = null;

async function login(): Promise<{ access_token: string; vendor_id: number }> {
  assertConfigured();
  const res = await fetch(`${BASE}/vendor_login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain_name: DOMAIN,
      email: EMAIL,
      password: PASSWORD,
      api_login: 1,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as KwikEnvelope<{
    access_token?: string;
    vendor_details?: { vendor_id?: number };
  }>;
  const token = body.data?.access_token;
  const vendorId = body.data?.vendor_details?.vendor_id;
  if (!res.ok || !token || vendorId == null) {
    throw new Error(`Kwik login failed (${res.status}): ${body?.message ?? ""}`);
  }
  session = { access_token: token, vendor_id: vendorId };
  return session;
}

async function ensureSession() {
  return session ?? (await login());
}

// Looks like an auth failure that a re-login might fix.
function isAuthError(status: number, body: { status?: number; message?: string }) {
  return (
    status === 401 ||
    body?.status === 401 ||
    /token|unauthor|log ?in/i.test(body?.message ?? "")
  );
}

// POST helper — injects access_token + domain_name, retries once on auth error.
async function kwikPost<T>(
  path: string,
  payload: Record<string, unknown>,
  retry = true
): Promise<KwikEnvelope<T>> {
  const s = await ensureSession();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain_name: DOMAIN,
      access_token: s.access_token,
      ...payload,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as KwikEnvelope<T>;
  if (retry && isAuthError(res.status, body)) {
    session = null;
    return kwikPost<T>(path, payload, false);
  }
  if (!res.ok || body.status >= 400) {
    throw new Error(`Kwik ${path} failed (${res.status}): ${body?.message ?? ""}`);
  }
  return body;
}

async function kwikGet<T>(
  path: string,
  params: Record<string, string | number>,
  retry = true
): Promise<KwikEnvelope<T>> {
  const s = await ensureSession();
  const qs = new URLSearchParams({
    access_token: s.access_token,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  }).toString();
  const res = await fetch(`${BASE}${path}?${qs}`);
  const body = (await res.json().catch(() => ({}))) as KwikEnvelope<T>;
  if (retry && isAuthError(res.status, body)) {
    session = null;
    return kwikGet<T>(path, params, false);
  }
  if (!res.ok || body.status >= 400) {
    throw new Error(`Kwik ${path} failed (${res.status}): ${body?.message ?? ""}`);
  }
  return body;
}

// ---------------------------------------------------------------------------
// Vehicle types — size: 0 bike, 1 small, 2 medium, 3 large.
// ---------------------------------------------------------------------------
export async function getVehicles(size = 0): Promise<KwikEnvelope<unknown>> {
  return kwikGet("/getVehicle", { is_vendor: 1, size });
}

// ---------------------------------------------------------------------------
// Quote — returns data.per_task_cost (NGN, naira) + currency.
// ---------------------------------------------------------------------------
export type PricingResult = { per_task_cost: string; currency?: { code: string } };
export type KwikJobOpts = {
  vehicleId?: number; // 1 Bike (default) — from getVehicles
  template?: string; // account task template
  paymentMethod?: number; // required by Kwik
};

// CONFIRMED live: these four fields are required for a successful price —
// custom_field_template + pickup_custom_field_template (account default
// "pricing-template"), vehicle_id (1 = Bike), and payment_method (32).
// Ikeja->Lekki returned per_task_cost "5732.28" NGN.
export async function calculatePricing(
  pickup: KwikStop,
  delivery: KwikStop,
  opts: KwikJobOpts = {}
): Promise<KwikEnvelope<PricingResult>> {
  const s = await ensureSession();
  const template = opts.template ?? "pricing-template";
  return kwikPost<PricingResult>("/send_payment_for_task", {
    vendor_id: s.vendor_id,
    timezone: TIMEZONE,
    is_multiple_tasks: 1,
    layout_type: 0,
    has_pickup: 1,
    has_delivery: 1,
    auto_assignment: 1,
    user_id: 1,
    custom_field_template: template,
    pickup_custom_field_template: template,
    vehicle_id: opts.vehicleId ?? 1,
    payment_method: opts.paymentMethod ?? 32, // TODO(confirm) meaning of 32
    is_loader_required: 0,
    is_cod_job: 0,
    pickups: [pickup],
    deliveries: [{ ...delivery, has_return_task: false, is_package_insured: 0 }],
  });
}

// ---------------------------------------------------------------------------
// Create a pickup+delivery task -> data.pickups[].job_id / job_token.
// ---------------------------------------------------------------------------
// Kwik expects task times in LOCAL (WAT, UTC+1) and in the future — a stale/UTC
// time returns "Order has been expired".
function watTime(minutesAhead: number): string {
  return new Date(Date.now() + 60 * 60000 + minutesAhead * 60000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
}

// Create a pickup+delivery task. CONFIRMED live: `amount` must be a STRING
// (the delivery cost from calculatePricing), times must be future WAT, and
// payment_method 0 (account default) works server-side — 8/32 (online) fail.
// Returns data.unique_order_id (tracking key) + per-leg job_id/job_token.
export async function createTask(
  pickup: KwikStop,
  delivery: KwikStop,
  amount: string,
  opts: KwikJobOpts = {}
): Promise<KwikEnvelope<{ unique_order_id?: string; deliveries?: { job_id?: number; job_token?: string }[] }>> {
  const s = await ensureSession();
  const template = opts.template ?? "pricing-template";
  return kwikPost("/v2/create_task_via_vendor", {
    vendor_id: s.vendor_id,
    timezone: TIMEZONE,
    is_multiple_tasks: 1,
    has_pickup: 1,
    has_delivery: 1,
    pickup_delivery_relationship: 0,
    layout_type: 0,
    auto_assignment: 1,
    custom_field_template: template,
    pickup_custom_field_template: template,
    vehicle_id: opts.vehicleId ?? 1,
    payment_method: opts.paymentMethod ?? 0,
    is_loader_required: 0,
    is_cod_job: 0,
    total_no_of_tasks: 1,
    amount,
    pickups: [{ ...pickup, time: watTime(45) }],
    deliveries: [{ ...delivery, has_return_task: false, time: watTime(90) }],
  });
}

// ---------------------------------------------------------------------------
// Tracking — by the task's unique_order_id (no customer_id needed, unlike
// getJobStatus). Returns { total_amount, orders: [{ job_type, job_status,... }] }
// where job_type 0 = pickup, 1 = delivery.
// ---------------------------------------------------------------------------
export type KwikTaskOrder = { job_type?: number; job_status?: number };
export async function getTaskByRelationshipId(
  uniqueOrderId: string
): Promise<KwikEnvelope<{ orders?: KwikTaskOrder[] }>> {
  return kwikGet("/view_task_by_relationship_id", { unique_order_id: uniqueOrderId });
}

// Map Kwik job_status -> our shipment/order progression.
// Tookan/Kwik codes (TODO(confirm) exact set): 0 assigned, 1 started/accepted,
// 2 in-progress/arrived, 3 successful, 4 failed, 6 deleted, 7 declined,
// 8 cancelled, 9 accepted, 10 started. We read the DELIVERY leg primarily.
export function mapKwikStatus(
  pickupStatus: number | undefined,
  deliveryStatus: number | undefined
): "assigned" | "picked_up" | "in_transit" | "delivered" | null {
  if (deliveryStatus === 3) return "delivered";
  if (deliveryStatus === 1 || deliveryStatus === 2 || deliveryStatus === 9 || deliveryStatus === 10)
    return "in_transit";
  if (pickupStatus === 3) return "picked_up"; // picked up, en route
  if (pickupStatus === 1 || pickupStatus === 2 || pickupStatus === 9 || pickupStatus === 10)
    return "picked_up";
  return "assigned";
}

export async function cancelTask(jobId: string | number): Promise<KwikEnvelope<unknown>> {
  return kwikPost("/cancel_vendor_task", { job_id: jobId });
}
