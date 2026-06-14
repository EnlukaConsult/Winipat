-- ============================================================
-- Winipat - Migration 020
-- GIG Logistics integration — FOUNDATION (schema only).
--
-- Provider-agnostic plumbing that doesn't depend on the still-pending GIG
-- answers (auth header is confirmed: token in `access-token`/`authorization`;
-- response envelope `{message, apiId, status, data}`). The request/response
-- SCHEMAS for /price and /capture are still pending, so the app client
-- (src/lib/gig.ts) has TODO(confirm) markers — but these tables are OUR
-- schema and won't change based on GIG's reply.
--
-- Adds:
--   1. gig_stations  — cached GIG station list (for address -> StationId).
--   2. shipments.*   — GIG identifiers (waybill, stations, quote, raw status).
--   3. logistics_partners.api_provider — mark which partner is API-backed.
--
-- Safe to apply before credentials exist. Apply AFTER 015–019.
-- ============================================================

-- ---- 1. GIG station cache --------------------------------------------------
-- Populated by a periodic sync (gig.syncLocalStations) from GIG's
-- /localstations/get etc. Used to map a buyer/seller address to a GIG
-- StationId required by /price and /capture.
CREATE TABLE IF NOT EXISTS gig_stations (
  gig_station_id  TEXT PRIMARY KEY,            -- GIG's StationId (stored as text)
  name            TEXT,
  state_name      TEXT,
  station_type    TEXT,                        -- local | international | service_centre
  raw             JSONB,                       -- full GIG payload for fields we don't model yet
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gig_stations_state ON gig_stations(state_name);

ALTER TABLE gig_stations ENABLE ROW LEVEL SECURITY;

-- Reference data: any signed-in user may read (checkout/quote needs it).
-- Writes happen only via the service-role sync job (bypasses RLS).
DROP POLICY IF EXISTS "gig_stations: authed read" ON gig_stations;
CREATE POLICY "gig_stations: authed read"
  ON gig_stations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---- 2. shipments GIG columns ----------------------------------------------
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS gig_waybill            TEXT,
  ADD COLUMN IF NOT EXISTS gig_sender_station_id  TEXT,
  ADD COLUMN IF NOT EXISTS gig_receiver_station_id TEXT,
  ADD COLUMN IF NOT EXISTS gig_quote_ref          TEXT,
  ADD COLUMN IF NOT EXISTS gig_quote_amount_kobo  INTEGER,
  ADD COLUMN IF NOT EXISTS gig_status             TEXT,   -- raw GIG status string
  ADD COLUMN IF NOT EXISTS gig_synced_at          TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_shipments_gig_waybill ON shipments(gig_waybill);

-- ---- 3. logistics_partners: API-backed marker ------------------------------
ALTER TABLE logistics_partners
  ADD COLUMN IF NOT EXISTS api_provider TEXT NOT NULL DEFAULT 'manual';  -- manual | gig

-- Flag the seeded GIG partner row(s) as GIG-API-backed.
UPDATE logistics_partners SET api_provider = 'gig'
WHERE api_provider = 'manual' AND name ILIKE 'GIG%';

NOTIFY pgrst, 'reload schema';
