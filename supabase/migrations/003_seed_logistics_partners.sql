-- Seed three logistics partners so the checkout picker is not empty in V1.
-- Admins can edit / add more via the admin portal.
-- Idempotent: ON CONFLICT DO NOTHING by name.
--
-- delivery_fee_kobo was added in migration 011; the column has a default
-- of 250000 (₦2,500) so this seed still works if migration 011 has been
-- applied. The UPDATE block at the bottom backfills the V1 per-partner
-- rates whether or not those partners already exist.

INSERT INTO logistics_partners (name, description, contact_email, contact_phone, is_active)
VALUES
  ('GIG Logistics',
   'Next-day delivery in Lagos, Abuja, PH. 2–4 days nationwide.',
   'support@giglogistics.com', '+234 700 444 5555', true),
  ('Sendbox',
   'Affordable inter-state delivery with package tracking.',
   'hello@sendbox.co', '+234 813 000 1111', true),
  ('Kwik Delivery',
   'Same-day in Lagos via dispatch riders. Best for small items.',
   'hi@kwik.delivery', '+234 902 000 2222', true)
ON CONFLICT DO NOTHING;

-- Backfill V1 per-partner fees (no-ops if migration 011 hasn't been
-- applied yet — column won't exist; safely catch the error).
DO $$
BEGIN
  UPDATE logistics_partners SET delivery_fee_kobo = 250000 WHERE name = 'GIG Logistics';
  UPDATE logistics_partners SET delivery_fee_kobo = 180000 WHERE name = 'Sendbox';
  UPDATE logistics_partners SET delivery_fee_kobo = 150000 WHERE name = 'Kwik Delivery';
EXCEPTION WHEN undefined_column THEN
  RAISE NOTICE 'logistics_partners.delivery_fee_kobo not present — apply migration 011 to enable per-partner pricing.';
END $$;
