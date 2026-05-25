-- ============================================================
-- Winipat — Migration 004
-- Background-job plumbing: escrow auto-release, trust score
-- recompute, SLA escalation. All idempotent / re-runnable.
--
-- The actual scheduling lives in vercel.json -> /api/cron/*.
-- Each cron route just calls the SECURITY DEFINER function below
-- with the service-role key.
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Timestamps we need for SLA + auto-release math
-- ---------------------------------------------------------------

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE escrow_ledger
  ADD COLUMN IF NOT EXISTS release_eligible_at TIMESTAMPTZ;

-- Stamp completed_at the first time order moves to 'completed'
CREATE OR REPLACE FUNCTION stamp_order_completed_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_stamp_completed_at ON orders;
CREATE TRIGGER trg_orders_stamp_completed_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION stamp_order_completed_at();

-- Stamp release_eligible_at the first time escrow moves to 'release_eligible'
CREATE OR REPLACE FUNCTION stamp_escrow_release_eligible_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'release_eligible'
     AND (OLD.status IS DISTINCT FROM 'release_eligible') THEN
    NEW.release_eligible_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escrow_stamp_release_eligible_at ON escrow_ledger;
CREATE TRIGGER trg_escrow_stamp_release_eligible_at
  BEFORE UPDATE ON escrow_ledger
  FOR EACH ROW EXECUTE FUNCTION stamp_escrow_release_eligible_at();

-- Backfill existing rows so the first cron run doesn't double-count
UPDATE escrow_ledger
   SET release_eligible_at = updated_at
 WHERE status = 'release_eligible' AND release_eligible_at IS NULL;

UPDATE orders
   SET completed_at = updated_at
 WHERE status = 'completed' AND completed_at IS NULL;

-- ---------------------------------------------------------------
-- 2. Settings table so the hold period / SLAs are tweakable
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (key, value) VALUES
  ('escrow_hold_hours',     '48'),    -- 2 days after buyer confirms
  ('sla_accept_hours',      '24'),    -- seller must accept within
  ('sla_ready_hours',       '72'),    -- seller must mark ready within
  ('sla_pickup_hours',      '48'),    -- partner must pick up within
  ('platform_fee_bps',      '300')    -- 3% commission on released escrow
ON CONFLICT (key) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_settings: admins read/write" ON platform_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------------------------------------------------------------
-- 3. Escrow auto-release + payout creation
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION auto_release_escrows()
RETURNS TABLE(released_count INTEGER, payouts_created INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hold_hours    INTEGER;
  v_fee_bps       INTEGER;
  v_released      INTEGER := 0;
  v_payouts       INTEGER := 0;
  r RECORD;
  v_payout_amount INTEGER;
  v_bank_id       UUID;
BEGIN
  SELECT value::INTEGER INTO v_hold_hours
    FROM platform_settings WHERE key = 'escrow_hold_hours';
  SELECT value::INTEGER INTO v_fee_bps
    FROM platform_settings WHERE key = 'platform_fee_bps';

  v_hold_hours := COALESCE(v_hold_hours, 48);
  v_fee_bps    := COALESCE(v_fee_bps, 300);

  FOR r IN
    SELECT el.id AS escrow_id, el.order_id, el.amount,
           o.seller_id, o.order_number, o.buyer_id
      FROM escrow_ledger el
      JOIN orders o ON o.id = el.order_id
     WHERE el.status = 'release_eligible'
       AND el.release_eligible_at IS NOT NULL
       AND el.release_eligible_at <= now() - (v_hold_hours || ' hours')::INTERVAL
  LOOP
    -- Mark escrow released
    UPDATE escrow_ledger
       SET status = 'released', released_at = now()
     WHERE id = r.escrow_id;
    v_released := v_released + 1;

    -- Payout net of platform fee, only if seller has a primary bank account
    SELECT id INTO v_bank_id FROM bank_accounts
     WHERE seller_id = r.seller_id AND is_primary = true LIMIT 1;

    IF v_bank_id IS NULL THEN
      -- Don't fail the release; admin will see "no bank" in payouts dashboard
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

    -- Record commission
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

-- ---------------------------------------------------------------
-- 4. Trust-score recompute (all sellers, every run — fine for V1)
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION recompute_all_trust_scores()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER := 0;
  s RECORD;
  v_avg_rating  NUMERIC(3,2);
  v_total       INTEGER;
  v_disputed    INTEGER;
  v_orders      INTEGER;
  v_on_time     INTEGER;
  v_dispute_rate NUMERIC(5,4);
  v_on_time_rate NUMERIC(5,4);
  v_badge       seller_badge;
BEGIN
  FOR s IN SELECT id FROM sellers LOOP
    SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0),
           COUNT(*)
      INTO v_avg_rating, v_total
      FROM reviews WHERE seller_id = s.id;

    SELECT COUNT(*) INTO v_orders FROM orders WHERE seller_id = s.id;
    SELECT COUNT(*) INTO v_disputed FROM orders
      WHERE seller_id = s.id AND status IN ('disputed', 'refunded');
    SELECT COUNT(*) INTO v_on_time FROM orders
      WHERE seller_id = s.id
        AND status = 'completed'
        AND completed_at IS NOT NULL
        AND created_at IS NOT NULL
        AND completed_at <= created_at + INTERVAL '7 days';

    v_dispute_rate := CASE WHEN v_orders > 0
      THEN ROUND((v_disputed::NUMERIC / v_orders)::NUMERIC, 4)
      ELSE 0 END;
    v_on_time_rate := CASE WHEN v_orders > 0
      THEN ROUND((v_on_time::NUMERIC / v_orders)::NUMERIC, 4)
      ELSE 0 END;

    -- Simple badge logic
    v_badge := NULL;
    IF v_total >= 50 AND v_avg_rating >= 4.5 AND v_dispute_rate <= 0.05 THEN
      v_badge := 'trusted_seller';
    ELSIF v_on_time_rate >= 0.9 AND v_total >= 10 THEN
      v_badge := 'fast_dispatch';
    END IF;

    INSERT INTO trust_scores
      (seller_id, average_rating, total_reviews, dispute_rate, on_time_rate, badge, updated_at)
    VALUES (s.id, v_avg_rating, v_total, v_dispute_rate, v_on_time_rate, v_badge, now())
    ON CONFLICT (seller_id) DO UPDATE SET
      average_rating = EXCLUDED.average_rating,
      total_reviews  = EXCLUDED.total_reviews,
      dispute_rate   = EXCLUDED.dispute_rate,
      on_time_rate   = EXCLUDED.on_time_rate,
      badge          = EXCLUDED.badge,
      updated_at     = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------
-- 5. SLA escalation
--
-- Soft-cancels unpaid orders past the accept window, and notifies
-- admins about sellers who have stalled on payment_confirmed or
-- seller_preparing. We never auto-cancel a paid order — admin
-- always decides on refunds.
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION escalate_overdue_orders()
RETURNS TABLE(cancelled INTEGER, escalated INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_accept_h  INTEGER;
  v_ready_h   INTEGER;
  v_cancelled INTEGER := 0;
  v_escalated INTEGER := 0;
  r RECORD;
BEGIN
  SELECT value::INTEGER INTO v_accept_h FROM platform_settings WHERE key = 'sla_accept_hours';
  SELECT value::INTEGER INTO v_ready_h  FROM platform_settings WHERE key = 'sla_ready_hours';
  v_accept_h := COALESCE(v_accept_h, 24);
  v_ready_h  := COALESCE(v_ready_h, 72);

  -- Cancel orders left in pending_payment for too long
  FOR r IN
    SELECT id, buyer_id, order_number FROM orders
     WHERE status = 'pending_payment'
       AND created_at < now() - (v_accept_h || ' hours')::INTERVAL
  LOOP
    UPDATE orders SET status = 'cancelled' WHERE id = r.id;
    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (r.buyer_id,
            'Order auto-cancelled',
            'Order ' || r.order_number || ' was cancelled because payment was not completed within ' || v_accept_h || ' hours.',
            'order',
            jsonb_build_object('order_id', r.id));
    v_cancelled := v_cancelled + 1;
  END LOOP;

  -- Seller stalled on payment_confirmed (didn't accept)
  FOR r IN
    SELECT o.id, o.seller_id, o.order_number FROM orders o
     WHERE o.status = 'payment_confirmed'
       AND o.updated_at < now() - (v_accept_h || ' hours')::INTERVAL
  LOOP
    INSERT INTO notifications (user_id, title, body, type, data)
    SELECT id, 'Order awaiting acceptance >' || v_accept_h || 'h',
           'Order ' || r.order_number || ' has not been accepted by the seller.', 'system',
           jsonb_build_object('order_id', r.id, 'seller_id', r.seller_id)
      FROM profiles WHERE role = 'admin'
    ON CONFLICT DO NOTHING;
    v_escalated := v_escalated + 1;
  END LOOP;

  -- Seller stalled on seller_preparing (didn't ready)
  FOR r IN
    SELECT o.id, o.seller_id, o.order_number FROM orders o
     WHERE o.status = 'seller_preparing'
       AND o.accepted_at IS NOT NULL
       AND o.accepted_at < now() - (v_ready_h || ' hours')::INTERVAL
  LOOP
    INSERT INTO notifications (user_id, title, body, type, data)
    SELECT id, 'Order stuck in preparing >' || v_ready_h || 'h',
           'Order ' || r.order_number || ' has been in seller_preparing for over ' || v_ready_h || ' hours.', 'system',
           jsonb_build_object('order_id', r.id, 'seller_id', r.seller_id)
      FROM profiles WHERE role = 'admin'
    ON CONFLICT DO NOTHING;
    v_escalated := v_escalated + 1;
  END LOOP;

  RETURN QUERY SELECT v_cancelled, v_escalated;
END;
$$;
