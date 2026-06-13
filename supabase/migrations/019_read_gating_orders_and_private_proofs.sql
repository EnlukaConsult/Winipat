-- ============================================================
-- Winipat - Migration 019
-- Follow-ups to the security review:
--
-- FIX #2 — read-gating gap. Migration 017 left orders / order_items /
--   order_status_history / addresses on the coarse is_admin() (= any
--   admin.access holder), so a limited staffer (e.g. a support agent or
--   payout approver) could read every order + buyer home address, and the
--   "orders: admins full access" FOR ALL policy even let them WRITE orders.
--   These reads are now gated to the operational view permissions, and admin
--   order writes are narrowed to explicit policies. Owner/party reads kept.
--
-- FIX #3 — delivery-proofs was a PUBLIC bucket with an unauthenticated read
--   policy, so proof photos (which often show a buyer's door / face /
--   signature) were world-readable to anyone with the URL. The bucket is
--   made PRIVATE and reads are scoped to logistics / admins / the order's
--   own buyer or seller. The client now serves proofs via short-lived
--   signed URLs (see logistics pages).
--
-- Apply AFTER migrations 015–018.
-- ============================================================

-- ====================== FIX #2: orders & friends ======================

-- ---- orders ----------------------------------------------------------------
DROP POLICY IF EXISTS "orders: buyer reads own"   ON orders;
DROP POLICY IF EXISTS "orders: admins full access" ON orders;

CREATE POLICY "orders: read"
  ON orders FOR SELECT
  USING (
    buyer_id = auth.uid()
    OR seller_id = auth.uid()
    OR has_permission('analytics.view')
    OR has_permission('disputes.view')
    OR has_permission('payouts.view')
    OR has_permission('settlements.view')
    OR has_permission('sellers.view')
  );

-- "orders: buyer creates" (buyer INSERT) and "orders: buyer/seller update
-- status" (UPDATE incl is_admin) are kept. Add explicit admin insert/delete
-- so admin order mutations via a session client still work (service-role API
-- routes bypass RLS regardless).
CREATE POLICY "orders: admin insert" ON orders FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "orders: admin delete" ON orders FOR DELETE USING (is_admin());

-- ---- order_items -----------------------------------------------------------
DROP POLICY IF EXISTS "order_items: parties read" ON order_items;
CREATE POLICY "order_items: read"
  ON order_items FOR SELECT
  USING (
    has_permission('analytics.view')
    OR has_permission('disputes.view')
    OR has_permission('payouts.view')
    OR has_permission('settlements.view')
    OR has_permission('sellers.view')
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- ---- order_status_history --------------------------------------------------
DROP POLICY IF EXISTS "order_status_history: parties read" ON order_status_history;
CREATE POLICY "order_status_history: read"
  ON order_status_history FOR SELECT
  USING (
    has_permission('analytics.view')
    OR has_permission('disputes.view')
    OR has_permission('payouts.view')
    OR has_permission('settlements.view')
    OR has_permission('sellers.view')
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- ---- addresses (buyer home-address PII) ------------------------------------
-- Keep "addresses: own rows" (owner FOR ALL). Restrict staff read to the
-- fulfilment/dispute permissions that genuinely need a delivery address —
-- finance/analytics staff do not.
DROP POLICY IF EXISTS "addresses: admins read all" ON addresses;
CREATE POLICY "addresses: staff read"
  ON addresses FOR SELECT
  USING (
    has_permission('disputes.view')
    OR has_permission('sellers.view')
  );

-- ====================== FIX #3: private proof photos ======================

UPDATE storage.buckets SET public = false WHERE id = 'delivery-proofs';

-- Drop the unauthenticated public-read policy from migration 018.
DROP POLICY IF EXISTS "delivery-proofs: public read" ON storage.objects;

-- Scoped read: logistics / admins, or the order's own buyer or seller. The
-- object name is "<shipmentId>/<file>", so the leading path segment maps back
-- to the shipment -> order parties. Served to clients as signed URLs.
DROP POLICY IF EXISTS "delivery-proofs: scoped read" ON storage.objects;
CREATE POLICY "delivery-proofs: scoped read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'delivery-proofs'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'logistics'
      )
      OR has_permission('pickups.manage')
      OR has_permission('deliveries.manage')
      OR EXISTS (
        SELECT 1 FROM shipments s
        JOIN orders o ON o.id = s.order_id
        WHERE s.id = NULLIF(split_part(name, '/', 1), '')::uuid
          AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
      )
    )
  );

NOTIFY pgrst, 'reload schema';
