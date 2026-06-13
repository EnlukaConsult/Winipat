-- ============================================================
-- Winipat - Migration 018
-- Make the logistics portal actually usable (manual V1):
--   1. Logistics users can READ the shipment queue. The base schema only
--      granted them UPDATE ("shipments: logistics update") and SELECT to
--      admins + order parties, so the pickups/deliveries pages returned
--      nothing for a logistics user.
--   2. A `delivery-proofs` storage bucket + policies so logistics can
--      upload pickup/delivery proof photos (shipments.pickup_proof_url /
--      delivery_proof_url already exist in the schema).
-- ============================================================

-- ---- 1. Logistics can read shipments ---------------------------------------
DROP POLICY IF EXISTS "shipments: logistics read" ON shipments;
CREATE POLICY "shipments: logistics read"
  ON shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'logistics'
    )
    OR has_permission('pickups.manage')
    OR has_permission('deliveries.manage')
  );

-- Keep the existing UPDATE policy but also let permission-holders update
-- (staff with logistics perms who aren't role='logistics').
DROP POLICY IF EXISTS "shipments: logistics update" ON shipments;
CREATE POLICY "shipments: logistics update"
  ON shipments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'logistics'
    )
    OR has_permission('pickups.manage')
    OR has_permission('deliveries.manage')
  );

-- ---- 2. delivery-proofs storage bucket -------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-proofs',
  'delivery-proofs',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Logistics (or admins) can upload proof photos.
DROP POLICY IF EXISTS "delivery-proofs: logistics upload" ON storage.objects;
CREATE POLICY "delivery-proofs: logistics upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'delivery-proofs'
    AND (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'logistics'
      )
      OR has_permission('pickups.manage')
      OR has_permission('deliveries.manage')
      OR is_admin()
    )
  );

-- Proof photos are readable (bucket is public; this covers client listing).
DROP POLICY IF EXISTS "delivery-proofs: public read" ON storage.objects;
CREATE POLICY "delivery-proofs: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'delivery-proofs');

NOTIFY pgrst, 'reload schema';
