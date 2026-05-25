-- ============================================================
-- Winipat — Migration 005
-- Per-product escrow hold override.
--
-- Some categories (electronics, custom orders) deserve a longer
-- buyer-protection window than the platform default. Sellers can
-- set products.escrow_hold_hours; the auto-release cron picks
-- whichever is longer (per-product OR platform_settings default).
--
-- The seller cannot use this to *shorten* the platform window —
-- only to lengthen it — to keep buyer protection consistent.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS escrow_hold_hours INTEGER NULL
    CHECK (escrow_hold_hours IS NULL OR escrow_hold_hours >= 0);

COMMENT ON COLUMN products.escrow_hold_hours IS
  'Optional per-product override for escrow hold (hours after delivery). NULL = use platform_settings.escrow_hold_hours. Auto-release uses MAX(per-product, platform default) across order_items.';

-- Replace auto_release_escrows() to honour the per-product override.
CREATE OR REPLACE FUNCTION auto_release_escrows()
RETURNS TABLE(released_count INTEGER, payouts_created INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_default_hours INTEGER;
  v_fee_bps       INTEGER;
  v_released      INTEGER := 0;
  v_payouts       INTEGER := 0;
  r RECORD;
  v_payout_amount INTEGER;
  v_bank_id       UUID;
  v_effective_hours INTEGER;
BEGIN
  SELECT value::INTEGER INTO v_default_hours
    FROM platform_settings WHERE key = 'escrow_hold_hours';
  SELECT value::INTEGER INTO v_fee_bps
    FROM platform_settings WHERE key = 'platform_fee_bps';

  v_default_hours := COALESCE(v_default_hours, 48);
  v_fee_bps       := COALESCE(v_fee_bps, 300);

  FOR r IN
    SELECT
      el.id AS escrow_id, el.order_id, el.amount, el.release_eligible_at,
      o.seller_id, o.order_number, o.buyer_id,
      (
        SELECT GREATEST(
          v_default_hours,
          COALESCE(MAX(p.escrow_hold_hours), v_default_hours)
        )
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = o.id
      ) AS effective_hours
    FROM escrow_ledger el
    JOIN orders o ON o.id = el.order_id
    WHERE el.status = 'release_eligible'
      AND el.release_eligible_at IS NOT NULL
  LOOP
    v_effective_hours := COALESCE(r.effective_hours, v_default_hours);

    -- Skip if hold window hasn't elapsed for THIS order
    CONTINUE WHEN r.release_eligible_at >
                  now() - (v_effective_hours || ' hours')::INTERVAL;

    UPDATE escrow_ledger
       SET status = 'released', released_at = now()
     WHERE id = r.escrow_id;
    v_released := v_released + 1;

    SELECT id INTO v_bank_id FROM bank_accounts
     WHERE seller_id = r.seller_id AND is_primary = true LIMIT 1;

    IF v_bank_id IS NULL THEN
      INSERT INTO notifications (user_id, title, body, type, data)
      VALUES (r.seller_id,
              'Add bank account to receive payout',
              'Escrow for ' || r.order_number || ' has been released but no primary bank account is set.',
              'system',
              jsonb_build_object('order_id', r.order_id));
      CONTINUE;
    END IF;

    v_payout_amount := r.amount - ROUND(r.amount * v_fee_bps / 10000.0);

    INSERT INTO payouts (seller_id, amount, bank_account_id, status)
    VALUES (r.seller_id, v_payout_amount, v_bank_id, 'pending');
    v_payouts := v_payouts + 1;

    INSERT INTO commissions (order_id, rate, amount)
    VALUES (r.order_id, v_fee_bps / 10000.0, r.amount - v_payout_amount)
    ON CONFLICT DO NOTHING;

    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (r.seller_id,
            'Payment released',
            'Your payout of ' || (v_payout_amount / 100) || ' NGN for order ' || r.order_number || ' is being processed.',
            'payment',
            jsonb_build_object('order_id', r.order_id));
  END LOOP;

  RETURN QUERY SELECT v_released, v_payouts;
END;
$$;
