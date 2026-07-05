# Winipat × Kwik Delivery — Integration Plan

_Auth verified live 2026-07 (staging). Endpoints/bodies extracted from the Kwik Apiary blueprint._

## Environments
- **API base:** `https://staging-api-test.kwik.delivery`
- **Client panel / domain_name:** `staging-client-panel.kwik.delivery`
- Currency in responses: **NGN** (Nigerian Naira). Prices are in **naira** (e.g. `per_task_cost: "1474.5"`) → ×100 for kobo.

## Auth (confirmed working)
`POST /vendor_login`  body: `{ domain_name, email, password, api_login: 1 }`
→ `data.access_token` (session token) + `data.vendor_details.vendor_id`.
Every other call takes `access_token` + `domain_name` (+ `vendor_id` for writes).
No refresh documented → cache token, re-login on auth failure.

## Endpoints we'll use
| Purpose | Method + path | Key fields |
|---|---|---|
| Login | `POST /vendor_login` | domain_name, email, password, api_login |
| Vehicle types | `GET /getVehicle?access_token&is_vendor=1&size=0..3` | size: 0 bike,1 small,2 medium,3 large |
| **Quote** | `POST /send_payment_for_task` | pickups[], deliveries[], vendor_id → `data.per_task_cost` (NGN) + currency |
| Price breakdown | `POST /get_bill_breakdown` | — |
| **Create shipment** | `POST /v2/create_task_via_vendor` | pickups[], deliveries[], has_pickup/has_delivery, auto_assignment → `data.pickups[].job_id`, `job_token` |
| Cancel | `POST /cancel_vendor_task` | — |
| **Track** | `GET /getJobStatus?unique_order_id&customer_id` | job status |
| Job details | `GET /view_task_by_relationship_id?access_token&unique_order_id` | — |

### pickups[] / deliveries[] item shape (both quote + create)
`{ address, name, latitude, longitude, time, phone, email }` (delivery adds `has_return_task:false`, `is_package_insured:0`).
**Pickups = seller pickup location; deliveries = buyer delivery address.**

## ⚠️ New dependency: geocoding (coordinates)
Kwik requires **latitude/longitude** for pickup and delivery — Winipat stores **text** addresses (street/city/state). So we must convert addresses → coordinates. Options:
- **(A) Google Geocoding API** server-side (needs `GOOGLE_MAPS_API_KEY`), cache coords on `addresses` + seller pickup. Most reliable. ← recommended
- **(B) Map picker** at address entry (buyer/seller drop a pin). More UI work, no external key.
- **(C)** A free geocoder (e.g. OpenStreetMap Nominatim) — rate-limited, lower NG accuracy.

This is the one decision needed before the quote/task calls can run.

## Mapping to Winipat flow
1. **Checkout quote** (`/api/logistics/quote`): geocode seller pickup + buyer address → `send_payment_for_task` → `per_task_cost` → delivery fee (kobo). (Falls back to manual flat fee if geocoding/Kwik unavailable — already the route's behaviour.)
2. **Create shipment**: when the **seller marks the order Ready** → `create_task_via_vendor` (seller=pickup, buyer=delivery, `auto_assignment:1`) → store `job_id`/`job_token` on `shipments`; Kwik dispatches a rider.
3. **Tracking** (`/api/cron/track-shipments`): `getJobStatus` per active job → map Kwik status → order status (`picked_up`/`in_transit`/`delivered`) so the buyer sees progress; on delivered, buyer confirms → completed + escrow release.

## Schema additions (migration 023)
- `addresses`: `latitude`, `longitude` (nullable, geocoded + cached).
- `sellers`: `pickup_latitude`, `pickup_longitude`.
- `shipments`: `kwik_job_id`, `kwik_job_token`, `kwik_status` (reuse the provider-agnostic pattern; gig_* columns already exist).
- `logistics_partners`: allow `api_provider = 'kwik'`.

## Env vars (server-only)
`KWIK_BASE_URL`, `KWIK_DOMAIN`, `KWIK_EMAIL`, `KWIK_PASSWORD`.

## Build phases
1. `src/lib/kwik.ts` — client: login + token cache + re-login; `getVehicles`, `calculatePricing`, `createTask`, `getJobStatus`, `cancelTask`. (Not blocked — auth confirmed.)
2. Geocoding util + migration 023 (coords columns + kwik shipment cols).
3. Wire `/api/logistics/quote` → Kwik pricing (behind geocoding).
4. Create task on seller "Ready".
5. Tracking cron → Kwik status → order progress.

## To confirm with live test calls during build
- Exact create-task response id used by `getJobStatus` (`job_id` vs `unique_order_id` vs `job_token`) + `customer_id` source.
- Vehicle/`custom_field_template` handling in pricing (example used `"custom_field_template":"pricing-template"`).
- `time` format + `timezone` for NG (WAT, +60).
- Whether staging `auto_assignment` has agents (else task stays unassigned).
