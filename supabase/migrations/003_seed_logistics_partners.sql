-- Seed three logistics partners so the checkout picker is not empty in V1.
-- Admins can edit / add more via the admin portal.
-- Idempotent: ON CONFLICT DO NOTHING by name.

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
