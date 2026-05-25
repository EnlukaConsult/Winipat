-- ============================================================
-- DEMO seed — gives a specific buyer a completed order so the
-- "Write a review" button becomes active on the product page.
--
-- Edit BUYER_EMAIL + SELLER_NAME below to target a real pair, then
-- run in the Supabase SQL editor. Idempotent: re-running won't
-- create duplicates because of the WHERE NOT EXISTS guard.
-- ============================================================

DO $$
DECLARE
  v_buyer_name    TEXT := 'lewis Gucci';              -- <- buyer's profiles.full_name (case-insensitive)
  v_seller_name   TEXT := 'Peace Fashions Lagos';     -- <- seller business_name
  v_buyer_id      UUID;
  v_seller_id     UUID;
  v_product_id    UUID;
  v_product_name  TEXT;
  v_product_price INTEGER;
  v_order_id      UUID;
BEGIN
  -- Look up the buyer profile by full_name (case-insensitive). If you have
  -- multiple buyers with the same name, swap this for an auth.users.email
  -- lookup instead.
  SELECT id INTO v_buyer_id
  FROM profiles
  WHERE lower(full_name) = lower(v_buyer_name)
    AND role = 'buyer'
  LIMIT 1;

  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Buyer profile not found: %', v_buyer_name;
  END IF;

  SELECT id INTO v_seller_id
  FROM sellers
  WHERE business_name = v_seller_name
  LIMIT 1;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Seller not found: %', v_seller_name;
  END IF;

  -- Skip if buyer already has a completed order with this seller
  IF EXISTS (
    SELECT 1 FROM orders
    WHERE buyer_id = v_buyer_id
      AND seller_id = v_seller_id
      AND status = 'completed'
  ) THEN
    RAISE NOTICE 'Buyer already has a completed order with this seller — skipping.';
    RETURN;
  END IF;

  -- Pick any active product from this seller for the order_items snapshot
  SELECT id, name, price
    INTO v_product_id, v_product_name, v_product_price
  FROM products
  WHERE seller_id = v_seller_id
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Seller % has no products to seed', v_seller_name;
  END IF;

  v_order_id := gen_random_uuid();

  INSERT INTO orders (
    id, buyer_id, seller_id, order_number, status,
    subtotal, logistics_fee, platform_fee, total, delivery_mode
  ) VALUES (
    v_order_id,
    v_buyer_id,
    v_seller_id,
    'WPT-DEMO-' || substr(v_order_id::text, 1, 8),
    'completed',
    v_product_price,
    250000,
    (v_product_price * 12) / 100,
    v_product_price + 250000,
    'door_to_door'
  );

  INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity)
  VALUES (v_order_id, v_product_id, v_product_name, v_product_price, 1);

  RAISE NOTICE 'Seeded demo completed order % for buyer % with seller %',
    v_order_id, v_buyer_email, v_seller_name;
END $$;
