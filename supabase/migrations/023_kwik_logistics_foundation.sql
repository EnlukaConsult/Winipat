-- ============================================================
-- Winipat - Migration 023
-- Kwik Delivery integration — foundation (schema).
--
-- Kwik prices/creates deliveries from GPS coordinates (pickup = seller,
-- delivery = buyer), unlike GIG's station IDs. Store geocoded coordinates on
-- addresses + sellers, and Kwik job identifiers on shipments.
--
-- See docs/kwik-integration-plan.md. Apply AFTER 014–022.
-- ============================================================

-- ---- geocoded coordinates --------------------------------------------------
ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS pickup_latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pickup_longitude DOUBLE PRECISION;

-- ---- Kwik shipment identifiers ---------------------------------------------
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS kwik_job_id    TEXT,
  ADD COLUMN IF NOT EXISTS kwik_job_token TEXT,
  ADD COLUMN IF NOT EXISTS kwik_status    TEXT;  -- raw Kwik job status

CREATE INDEX IF NOT EXISTS idx_shipments_kwik_job_id ON shipments(kwik_job_id);

-- logistics_partners.api_provider is free-text ('manual' | 'gig' | 'kwik').
-- Seed/flag a Kwik partner row if one exists by name.
UPDATE logistics_partners SET api_provider = 'kwik'
WHERE api_provider = 'manual' AND name ILIKE 'Kwik%';

NOTIFY pgrst, 'reload schema';
