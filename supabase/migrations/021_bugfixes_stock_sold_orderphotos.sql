-- ============================================================
-- Winipat - Migration 021
-- Bug fixes: stock decrement + real units-sold + order-photos bucket.
--
-- Bug 1: seller "package photo" upload targets an `order-photos` bucket that
--        was never created -> "Bucket not found". Create it (public, like
--        product-images; the upload uses getPublicUrl).
-- Bug 4/5: products.stock_quantity was never decremented and "units sold"
--        was fabricated in the UI. Add a real units_sold counter + an RPC
--        that decrements stock and increments units_sold on payment, and
--        backfill units_sold from existing paid orders.
--
-- Apply AFTER 014–020.
-- ============================================================

-- ---- order-photos bucket (Bug 1) -------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-photos', 'order-photos', true, 5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "order-photos: authed upload" ON storage.objects;
CREATE POLICY "order-photos: authed upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'order-photos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "order-photos: public read" ON storage.objects;
CREATE POLICY "order-photos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-photos');

-- ---- real units sold + stock decrement (Bug 4/5) ---------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS units_sold INTEGER NOT NULL DEFAULT 0;

-- Applied once per order when payment is confirmed (called from the Paystack
-- webhook with the service-role client). SECURITY DEFINER so it isn't blocked
-- by RLS. Stock floored at 0; units_sold accumulates.
CREATE OR REPLACE FUNCTION apply_order_stock(p_order_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  UPDATE products p
  SET stock_quantity = GREATEST(0, p.stock_quantity - oi.quantity),
      units_sold     = COALESCE(p.units_sold, 0) + oi.quantity,
      updated_at     = now()
  FROM order_items oi
  WHERE oi.order_id = p_order_id AND oi.product_id = p.id;
$$;

-- Backfill units_sold from existing paid/in-progress/completed orders so the
-- counter is correct from day one (runs as migration owner -> bypasses RLS).
UPDATE products p
SET units_sold = COALESCE(s.qty, 0)
FROM (
  SELECT oi.product_id, SUM(oi.quantity) AS qty
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status IN (
    'payment_confirmed','seller_preparing','awaiting_pickup',
    'picked_up','in_transit','delivered','disputed','completed'
  )
  GROUP BY oi.product_id
) s
WHERE s.product_id = p.id;

NOTIFY pgrst, 'reload schema';
