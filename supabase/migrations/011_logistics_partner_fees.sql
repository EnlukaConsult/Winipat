-- ============================================================
-- Winipat - Migration 011
-- Move logistics-partner fees out of the checkout page (where
-- they were hard-coded by partner NAME in a JS map) and into
-- the database, so admins can adjust pricing without a deploy
-- and so new partners don't silently default to ₦2,500.
--
-- Fee is in kobo, NOT NULL with a sane default of ₦2,500.
-- ============================================================

ALTER TABLE logistics_partners
  ADD COLUMN IF NOT EXISTS delivery_fee_kobo INTEGER NOT NULL DEFAULT 250000
    CHECK (delivery_fee_kobo >= 0);

COMMENT ON COLUMN logistics_partners.delivery_fee_kobo IS
  'Flat per-order delivery fee in kobo (V1 pricing). Real per-route pricing comes later.';

-- Backfill known V1 fees by name (matches the old hard-coded map)
UPDATE logistics_partners SET delivery_fee_kobo = 250000 WHERE name = 'GIG Logistics';
UPDATE logistics_partners SET delivery_fee_kobo = 180000 WHERE name = 'Sendbox';
UPDATE logistics_partners SET delivery_fee_kobo = 150000 WHERE name = 'Kwik Delivery';

NOTIFY pgrst, 'reload schema';
