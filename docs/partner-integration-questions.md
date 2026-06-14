# Winipat — Integration Access Request

We're integrating **Winipat** (a Nigerian commerce platform) with your API. We've
already verified your endpoints are **live** — we're blocked only on **credentials**.
Please send the items under **"We need from you"** so we can start, then confirm the
short technical list. A **Postman export** (sample request + response) for the starred
endpoints would unblock us fastest.

---

## GIG Logistics

### 🔑 We need from you (to start)
1. **Sandbox test account** — a registered **email + password** for `POST /login`.
2. **Production base URL** + production credentials (docs only show the test host `dev-thirdpartynode.theagilitysystems.com`).
3. Our **`CustomerCode` / account identifier** (required by `/price`).
4. ⭐ **Sample request + response** (or Postman export) for `POST /price` and `POST /capture/preshipment`.

> Already confirmed on our side: auth is a token sent in the `access-token` **or** `authorization` header; response envelope is `{message, apiId, status, data}`. So we just need the login creds above.

### ✅ Quick confirmations
- Full field schemas for `SenderDetails`, `ReceiverDetails`, `ShipmentDetails`, `ShipmentItems`, `SenderLocation`, `ReceiverLocation`.
- **How is shipping paid?** Prepaid wallet, charged at `capture`, or via invoice? (`/chargeWallet` has no logistics option.)
- Does `POST /capture/preshipment` **return a waybill**?
- Tracking — **poll-only, or is there a status webhook?** Full status value set + is proof-of-delivery available via API?
- Token lifetime / refresh? Rate limits?

---

## Xpend

### 🔑 We need from you (to start)
1. **Sandbox API key** (`xpk_test_…`) for our account.
2. The **exact secret format** to send as `Authorization: Bearer …` (docs show both `key_id.secret` and `xpk_…`).
3. Confirm the **correct base path** — `GET /v1/merchant/principal` returns `404` for us without a key; confirm the path and that it requires auth.
4. The **KYB / go-live** steps to obtain a live key.

### ✅ Quick confirmations
- **Do you support NGN fiat payout to Nigerian bank accounts today?** Which banks / corridors?
- Can payouts go **directly to our sellers' bank accounts**, or only to Winipat-controlled accounts?
- Payout **fees, limits, processing times**; is there a **reusable beneficiary object**, or resolve-per-payout?
- Webhooks — confirm `HMAC-SHA256(secret, "{timestamp}.{rawBody}")`, the **timestamp tolerance**, retry/backoff, and **sender IP ranges** (for allowlisting).
- Which event is the **authoritative payment-complete** signal? Payment-intent expiry? Rate limits?

---

## Pandascrow

### 🔑 We need from you (to start)
1. **Sandbox account + API key/secret** — every call (even `POST /login`) returns *"Requires authentication"*, so we need the key to do anything.
2. The **exact auth header** to send the key (`Authorization: Bearer …` vs `x-api-key` vs both?).
3. ⭐ **Sample request + response** for `POST /escrow/initialize`, including the nested object schemas (`buyer_details`, `seller_details`, `payout`, `milestones`).

### ✅ Quick confirmations
- Is there a **refund API** (and **partial refunds**)? Is there a **dispute API** (create / upload evidence / resolve)?
- **Release model:** API/timer-triggered, or is buyer **OTP mandatory**? Auto-release timing once `inspection_period` lapses?
- **Split payouts** to multiple sellers (marketplace) — supported?
- `amount` **units** (decimal vs smallest unit)? Token lifetime / refresh?
- Webhook **event catalog + signature scheme + retry policy**.
- The **exact escrow rate** within 3–5% for us, **who pays** (buyer/seller/both), and the **10%/180-day reserve basis** — negotiable?

---

**Send to:** _[GIG / Xpend / Pandascrow contact]_ · **From:** Winipat (Enluka Consultancy Services)
