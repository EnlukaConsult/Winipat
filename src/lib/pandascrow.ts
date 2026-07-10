// Pandascrow API client (server-only) — used for Nigerian KYC verification
// (NIN + NUBAN bank-account lookups). Escrow stays in-house; this client only
// touches the /kyc and /bank endpoints.
//
// Docs: docs/Pandascrow_API_Complete_Documentation.docx
//   Sandbox  https://sandbox.pandascrow.io
//   Live     https://api.pandascrow.io
//
// UNCONFIRMED in the docs (the ReadMe hid them) — wired to be flipped by env
// once you read them off the Pandascrow dashboard:
//   1. The exact auth header. Two styles supported below via PANDASCROW_AUTH_STYLE:
//        "login"   -> POST /login {email,password} -> Bearer <access_token>
//        "api_key" -> a static key sent in PANDASCROW_AUTH_HEADER (default Authorization)
//   2. The exact response envelope. Parsing is defensive: we scan for the
//      common field names and return the raw payload alongside.
//
// Import-safe without credentials — isPandascrowConfigured() is false until the
// env is set, so callers no-op and the app behaves exactly as before.

const ENV = (process.env.PANDASCROW_ENV ?? "sandbox").trim().toLowerCase();
const clean = (v: string | undefined) => (v ?? "").split(/[\r\n]/)[0].trim();

const BASE = (() => {
  const explicit = clean(process.env.PANDASCROW_BASE_URL);
  if (explicit) return explicit.replace(/\/+$/, "");
  return ENV === "live" ? "https://api.pandascrow.io" : "https://sandbox.pandascrow.io";
})();

// Auth. Two modes:
//   * Static key (PANDASCROW_API_KEY) — sent as `<HEADER>: <SCHEME> <key>`,
//     defaulting to `Authorization: Bearer <key>`. This is the confirmed mode:
//     Pandascrow's dashboard exposes a header bearer token.
//   * Login (PANDASCROW_EMAIL/PASSWORD) — POST /login, then Bearer <token>.
// Set PANDASCROW_AUTH_SCHEME="" + PANDASCROW_AUTH_HEADER=x-api-key for a raw key.
const AUTH_HEADER = clean(process.env.PANDASCROW_AUTH_HEADER) || "Authorization";
const AUTH_SCHEME =
  process.env.PANDASCROW_AUTH_SCHEME != null
    ? clean(process.env.PANDASCROW_AUTH_SCHEME)
    : "Bearer";
const API_KEY = clean(process.env.PANDASCROW_API_KEY);
const EMAIL = clean(process.env.PANDASCROW_EMAIL);
const PASSWORD = clean(process.env.PANDASCROW_PASSWORD);
// Some endpoints key off the account's own uuid; captured at login if returned,
// or supplied directly.
const ACCOUNT_UUID = clean(process.env.PANDASCROW_UUID);

// Static key takes precedence over the login flow when present.
const USE_STATIC_KEY = Boolean(API_KEY);

export function isPandascrowConfigured(): boolean {
  if (!BASE) return false;
  return USE_STATIC_KEY || Boolean(EMAIL && PASSWORD);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
let session: { token: string; uuid: string | null } | null = null;

async function login(): Promise<{ token: string; uuid: string | null }> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Pandascrow login failed (${res.status}): ${extractMessage(body)}`);
  }
  // Defensive token extraction across likely shapes.
  const data = (body.data ?? body) as Record<string, unknown>;
  const token =
    (data.access_token as string) ||
    (data.token as string) ||
    (body.access_token as string) ||
    (body.token as string) ||
    "";
  if (!token) throw new Error("Pandascrow login: no access token in response");
  const uuid =
    (data.uuid as string) ||
    (data.user_uuid as string) ||
    ((data.user as Record<string, unknown>)?.uuid as string) ||
    ACCOUNT_UUID ||
    null;
  session = { token, uuid };
  return session;
}

async function ensureSession() {
  if (USE_STATIC_KEY) return { token: API_KEY, uuid: ACCOUNT_UUID || null };
  return session ?? (await login());
}

function authHeaders(token: string): Record<string, string> {
  if (USE_STATIC_KEY) {
    // `Authorization: Bearer <key>` by default; scheme/header configurable.
    const value = AUTH_SCHEME ? `${AUTH_SCHEME} ${token}` : token;
    return { [AUTH_HEADER]: value };
  }
  return { Authorization: `Bearer ${token}` };
}

// ---------------------------------------------------------------------------
// Low-level GET with one auth retry (re-login on 401 for the login style).
// ---------------------------------------------------------------------------
async function kycGet(
  path: string,
  params: Record<string, string>,
  retry = true
): Promise<{ ok: boolean; status: number; raw: Record<string, unknown> }> {
  const s = await ensureSession();
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Accept: "application/json", ...authHeaders(s.token) },
  });
  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (retry && res.status === 401 && !USE_STATIC_KEY) {
    session = null;
    return kycGet(path, params, false);
  }
  return { ok: res.ok, status: res.status, raw };
}

function extractMessage(body: Record<string, unknown>): string {
  const data = (body.data ?? {}) as Record<string, unknown>;
  return (
    (body.message as string) ||
    (data.message as string) || // NUBAN nests the reason under data.message
    (body.error as string) ||
    (body.msg as string) ||
    JSON.stringify(body).slice(0, 200)
  );
}

// Per Pandascrow's response-code table, annotate the billed-lookup failure
// modes so the admin sees an actionable reason, not a generic "check failed".
function friendlyMessage(status: number, raw: Record<string, unknown>): string {
  const base = extractMessage(raw);
  if (status === 402) return `Pandascrow balance low — top up to run KYC checks. (${base})`;
  if (status === 424) return `Verification source temporarily unavailable — retry later. (${base})`;
  if (status === 429) return `Rate limited by Pandascrow — retry shortly. (${base})`;
  return base;
}

// Pull a human name out of a KYC payload. Pandascrow nests the record under
// data.entity (NIN: first/middle/last; NUBAN: account_name), so check there
// first, then fall back to data.* / root for other shapes.
function extractName(raw: Record<string, unknown>): string | null {
  const data = (raw.data ?? raw) as Record<string, unknown>;
  const d = ((data.entity as Record<string, unknown>) ?? data) as Record<string, unknown>;
  const direct =
    (d.account_name as string) ||
    (d.name as string) ||
    (d.full_name as string) ||
    (d.fullName as string);
  if (direct) return direct;
  const first = (d.first_name as string) || (d.firstName as string) || "";
  const middle = (d.middle_name as string) || (d.middleName as string) || "";
  const last = (d.last_name as string) || (d.lastName as string) || (d.surname as string) || "";
  const composed = [first, middle, last].filter(Boolean).join(" ").trim();
  return composed || null;
}

export type KycResult = {
  ok: boolean; // API call succeeded (200 with data)
  status: number; // HTTP status
  verifiedName: string | null; // registered name returned by the source
  message: string; // human-readable status/error
  raw: Record<string, unknown>; // full payload (do NOT persist sensitive fields)
};

// ---------------------------------------------------------------------------
// NIN lookup — GET /kyc/ng/lookup/nin?nin=
// ---------------------------------------------------------------------------
export async function lookupNin(nin: string): Promise<KycResult> {
  const { ok, status, raw } = await kycGet("/kyc/ng/lookup/nin", { nin });
  return { ok, status, verifiedName: extractName(raw), message: friendlyMessage(status, raw), raw };
}

// ---------------------------------------------------------------------------
// Bank account (NUBAN) lookup — GET /kyc/ng/lookup/nuban?account_number=&bank_code=
// ---------------------------------------------------------------------------
export async function lookupNuban(
  accountNumber: string,
  bankCode: string
): Promise<KycResult> {
  const { ok, status, raw } = await kycGet("/kyc/ng/lookup/nuban", {
    account_number: accountNumber,
    bank_code: bankCode,
  });
  return { ok, status, verifiedName: extractName(raw), message: friendlyMessage(status, raw), raw };
}

// ---------------------------------------------------------------------------
// Supported banks — GET /bank/lists (for mapping bank name -> bank_code).
// ---------------------------------------------------------------------------
export async function fetchBanks(): Promise<Record<string, unknown>> {
  const { raw } = await kycGet("/bank/lists", {});
  return raw;
}

// ---------------------------------------------------------------------------
// Name matching — Nigerian names vary in order/spelling, so compare on a
// normalized token set with a coverage threshold rather than exact equality.
// ---------------------------------------------------------------------------
export function nameMatch(
  input: string,
  verified: string | null
): { match: boolean; score: number } {
  if (!verified || !input) return { match: false, score: 0 };
  const norm = (s: string) =>
    s
      .toUpperCase()
      .replace(/[^A-Z\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);
  const a = new Set(norm(input));
  const b = new Set(norm(verified));
  if (a.size === 0 || b.size === 0) return { match: false, score: 0 };
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  // Coverage of the smaller set — tolerant of an extra/missing middle name.
  const score = shared / Math.min(a.size, b.size);
  return { match: score >= 0.5, score };
}
