# Winipat × Partner Integrations — Plan (GIG Logistics, Xpend, Pandascrow)

_Drafted 2026-06-14. Source docs: `GIG_Logistics_*`, `Xpend_*`, `Pandascrow_*` packs (Desktop)._

## 0. How the three map to Winipat

| Provider | Type | Replaces / augments | Touches |
|---|---|---|---|
| **GIG Logistics** | Courier/shipping | Replaces the **logistics stub** (flat-fee seeded partners, dead buttons) | `shipments`, `logistics_partners`, logistics portal, checkout fee |
| **Xpend** | **Crypto/stablecoin** gateway + wallet + payout (fiat NGN payout gated) | Overlaps **Paystack** collection + transfers | `payment_transactions`, payouts |
| **Pandascrow** | **Escrow-as-a-service** (custodies funds) | Could replace **in-house `escrow_ledger`** + Paystack collection | escrow, disputes, payouts |

## 1. Cross-cutting reality check
All three doc packs are **drafts** assembled from public ReadMe pages. In every pack the following are **unconfirmed and must be resolved in a sandbox before building**: exact **auth header**, **webhook event catalog + signature scheme**, and **nested request/response schemas**. → Every provider gets a **Phase 0 discovery spike** (test creds + Postman capture + a question list) before implementation.

## 2. Recommended direction

- **GIG Logistics — build now.** It's purely additive, fixes the known stub, and doesn't touch the money model. Highest clear value, lowest risk.
- **Escrow — keep in-house for now.** Pandascrow shifts **fund custody** to Pandascrow, gates release behind buyer **OTP**, and its docs are missing a **refund API, a dispute API, and the webhook contract**. Ripping out working escrow for an under-documented managed one is high-risk. Evaluate via a sandbox spike as a *separate* later workstream.
- **Payments/Payout (Xpend) — keep Paystack primary.** Xpend is **crypto-first**; NGN **fiat** payout is "where enabled / roadmap." Only pursue if (a) you want a crypto payment option, or (b) Xpend confirms a **live NGN fiat corridor + direct-to-seller payout** as a Paystack-transfer alternative. Low priority until confirmed.

So the near-term concrete workstream is **GIG**; Pandascrow and Xpend are **decision-gated** (need provider answers + a product call) before committing.

---

## 3. GIG Logistics — implementation plan

**Base (test only):** `https://dev-thirdpartynode.theagilitysystems.com` · **prod URL not yet provided.** Backend-only; no client exposure.

### Phase 0 — Discovery spike (BLOCKING)
Get from GIG / confirm in sandbox:
1. **Auth header format** + token field name in `/login` response; **token lifetime**; refresh (none documented → plan re-login on 401).
2. **Nested schemas** for `SenderDetails`, `ReceiverDetails`, `ShipmentDetails`, `ShipmentItems`, `SenderLocation`, `ReceiverLocation` (docs show `{}` placeholders — can't build `/price` or `/capture` without these).
3. **Billing model** — how shipping is paid (prepaid wallet? charged at capture? via invoice?). `/chargeWallet` BillType enum has **no logistics type** → unresolved.
4. Does **`/capture/preshipment` return a waybill**? (whole flow assumes yes).
5. **Tracking** — confirm poll-only (no webhook documented); get the **status enum** + `fetchOption` meaning; proof-of-delivery availability.
6. `CustomerCode` source (`/companyDetails/get`?); enum meanings (`VehicleType`, `CustomerType`, `PickUpOptions`, `DeliveryType`); rate limits; production base URL + creds.

### Phase 1 — Foundation
- `src/lib/gig.ts` — server client: login + token cache, re-login on 401, typed wrappers.
- Env: `GIG_BASE_URL`, `GIG_EMAIL`, `GIG_PASSWORD` (or API creds).
- **Station cache**: pull `/localstations/get`, `/serviceCentresByStation`, `/lga/active`, `/homedelivery/active`; persist to a `gig_stations` table; map NG state/city (we already have `nigeria-locations`) → GIG `StationId`. Refresh via cron (daily/weekly).

### Phase 2 — Live rate quotes at checkout
- Replace flat `logistics_partners.delivery_fee_kobo` with a live `POST /price` call (sender = seller pickup station, receiver = buyer station, items from cart).
- Surface real quote on checkout; persist chosen quote (amount + ref) on the order so the captured shipment matches.

### Phase 3 — Shipment creation
- On payment confirmed (escrow funded), call `POST /capture/preshipment` → store **waybill** on `shipments`.
- Optional `POST /invoice/generate`.
- Add `shipments` columns: `gig_waybill`, `sender_station_id`, `receiver_station_id`, `quote_ref`, `gig_raw_status`. Mark `logistics_partners` rows as API-backed vs manual.

### Phase 4 — Tracking (poll)
- New cron `/api/cron/track-shipments` (reuse `cron-auth`, add to `vercel.json`): batch `POST /track/multipleMobileShipment` for active waybills → map GIG status → `shipments.status` + order status; on "delivered" feed the existing delivery-confirmation → escrow-release path.

### Phase 5 — Drop-off option
- `/dropOff/price` → `/create/dropOff`; seller drops at GIG centre; same tracking.

**Effort:** Phase 0 (provider-dependent) + ~Phases 1–4 the core build. Replaces the manual V1 we shipped (proof-upload UI stays useful as fallback).

---

## 4. Pandascrow — decision-gated (escrow swap)
**Sandbox:** `https://sandbox.pandascrow.io` · **Live:** `https://api.pandascrow.io`.
Lifecycle: create (`/escrow/initialize`) → fund (virtual acct / wallet / invoice / payme) → release via `/escrow/complete` (buyer **OTP**) → query `/escrow/single`. Fees **3–5%** + 10% rolling reserve (180d).

**Why not now:** funds custody moves to Pandascrow (our `escrow_ledger` becomes a mirror); **no documented refund or dispute API**; webhook contract + auth header unknown; OTP-gated release conflicts with our timed auto-release. **Spike in sandbox to confirm refund API, dispute API, webhook contract, and OTP-vs-timed release before any commitment.**

## 5. Xpend — decision-gated (crypto pay/payout)
**Base:** `https://bapi.justxpend.ai/v1` · keys `xpk_test_` / `xpk_live_` · Bearer auth · `Idempotency-Key` on creates · webhooks `HMAC-SHA256(secret, "{timestamp}.{rawBody}")` header `x-xpend-signature`.
Collection = **stablecoin-in**; payout = crypto (fiat NGN "where enabled"). Good fit as an **optional crypto payment method** and/or **crypto payout rail**. **Confirm with Xpend: live NGN fiat corridor? direct-to-seller payout? fees/limits?** before treating as a Paystack alternative.

---

## 6. Question lists to send each provider
- **GIG:** items in §3 Phase 0 (auth header, nested schemas, billing model, capture→waybill, tracking webhook+statuses, prod URL/creds, rate limits).
- **Pandascrow:** auth header; webhook event catalog + signature; refund API (+ partial); dispute API; OTP-vs-timed/auto release + auto-release timing; split payouts to multiple sellers; `amount` units; nested schemas; exact escrow rate + reserve basis.
- **Xpend:** NGN fiat corridor live? direct-to-seller payout vs only to Winipat accounts? payout fees/limits/times; enabled chains/tokens; webhook retry/timestamp tolerance; authoritative completion event; KYB/go-live process.

## 7. Risks
- All docs are drafts → real schemas/webhooks differ; budget for sandbox discovery.
- GIG has **no webhooks** (poll-only) and an **unclear billing model**.
- Pandascrow changes the **money-custody model** and lacks refund/dispute APIs in docs.
- Xpend is **crypto-first**; NGN fiat payout unconfirmed.
