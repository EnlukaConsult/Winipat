-- =============================================================================
-- Winipat Trust-First Commerce Platform — Supabase Schema
-- Nigeria Escrow Payments Platform
-- =============================================================================
-- Run this entire file in the Supabase SQL editor (Database > SQL Editor)
-- All amounts are stored in KOBO (integer). 100 kobo = ₦1
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for full-text search on names/products

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin', 'logistics');

CREATE TYPE seller_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected');

CREATE TYPE kyc_document_type AS ENUM ('government_id', 'bank_statement', 'utility_bill');

CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE product_status AS ENUM ('draft', 'active', 'paused', 'removed');

CREATE TYPE media_type AS ENUM ('image', 'video');

CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'payment_confirmed',
  'awaiting_pickup',
  'picked_up',
  'in_transit',
  'delivered',
  'disputed',
  'completed',
  'cancelled',
  'refunded'
);

CREATE TYPE delivery_mode AS ENUM ('door_to_door', 'pickup_office');

CREATE TYPE shipment_status AS ENUM ('assigned', 'picked_up', 'in_transit', 'delivered');

CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed');

CREATE TYPE payment_provider AS ENUM ('paystack', 'flutterwave');

CREATE TYPE escrow_status AS ENUM (
  'initiated',
  'authorized',
  'captured',
  'held',
  'release_eligible',
  'released',
  'refunded',
  'disputed'
);

CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'processed', 'rejected');

CREATE TYPE dispute_status AS ENUM (
  'open',
  'under_review',
  'resolved_seller',
  'resolved_buyer',
  'resolved_partial'
);

CREATE TYPE seller_badge AS ENUM ('verified', 'trusted_seller', 'fast_dispatch');

-- =============================================================================
-- IDENTITY & AUTH
-- =============================================================================

-- profiles — mirrors auth.users, extended with app data
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  phone       TEXT,
  full_name   TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'buyer',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_email_check CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- addresses
CREATE TABLE addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,             -- e.g. "Home", "Office"
  street      TEXT NOT NULL,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'Nigeria',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- =============================================================================
-- SELLER VERIFICATION
-- =============================================================================

-- sellers — one-to-one with profiles (role = 'seller')
CREATE TABLE sellers (
  id               UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  business_name    TEXT NOT NULL,
  description      TEXT,
  pickup_address   TEXT,
  status           seller_status NOT NULL DEFAULT 'draft',
  admin_notes      TEXT,
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sellers_status ON sellers(status);

-- seller_kyc_documents
CREATE TABLE seller_kyc_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  document_type  kyc_document_type NOT NULL,
  file_url       TEXT NOT NULL,
  status         document_status NOT NULL DEFAULT 'pending',
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seller_kyc_seller_id ON seller_kyc_documents(seller_id);
CREATE INDEX idx_seller_kyc_status    ON seller_kyc_documents(status);

-- bank_accounts
CREATE TABLE bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  bank_name       TEXT NOT NULL,
  account_number  TEXT NOT NULL,
  account_name    TEXT NOT NULL,
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_accounts_seller_id ON bank_accounts(seller_id);

-- =============================================================================
-- PRODUCT CATALOG
-- =============================================================================

-- categories — supports nested subcategories via self-referential parent_id
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug      ON categories(slug);

-- products
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  price           INTEGER NOT NULL,                        -- stored in kobo
  stock_quantity  INTEGER NOT NULL DEFAULT 0,
  status          product_status NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT products_price_positive    CHECK (price > 0),
  CONSTRAINT products_stock_non_negative CHECK (stock_quantity >= 0)
);

CREATE INDEX idx_products_seller_id   ON products(seller_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status      ON products(status);
CREATE INDEX idx_products_slug        ON products(slug);
CREATE INDEX idx_products_name_trgm   ON products USING gin(name gin_trgm_ops);

-- product_media
CREATE TABLE product_media (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  file_url       TEXT NOT NULL,
  media_type     media_type NOT NULL DEFAULT 'image',
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_media_product_id ON product_media(product_id);

-- =============================================================================
-- ORDERS & CART
-- =============================================================================

-- carts — one active cart per user
CREATE TABLE carts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT carts_unique_user UNIQUE (user_id)
);

CREATE INDEX idx_carts_user_id ON carts(user_id);

-- cart_items
CREATE TABLE cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cart_items_unique_product UNIQUE (cart_id, product_id),
  CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_cart_items_cart_id    ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);

-- logistics_partners — declared early so orders can reference it
CREATE TABLE logistics_partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  logo_url        TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- orders
CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  seller_id             UUID NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
  order_number          TEXT NOT NULL UNIQUE,
  status                order_status NOT NULL DEFAULT 'pending_payment',
  subtotal              INTEGER NOT NULL,                    -- kobo
  logistics_fee         INTEGER NOT NULL DEFAULT 0,         -- kobo
  platform_fee          INTEGER NOT NULL DEFAULT 0,         -- kobo
  total                 INTEGER NOT NULL,                   -- kobo
  delivery_mode         delivery_mode NOT NULL DEFAULT 'door_to_door',
  logistics_partner_id  UUID REFERENCES logistics_partners(id) ON DELETE SET NULL,
  delivery_address_id   UUID REFERENCES addresses(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT orders_subtotal_positive  CHECK (subtotal > 0),
  CONSTRAINT orders_total_positive     CHECK (total > 0),
  CONSTRAINT orders_logistics_fee_gte0 CHECK (logistics_fee >= 0),
  CONSTRAINT orders_platform_fee_gte0  CHECK (platform_fee >= 0)
);

CREATE INDEX idx_orders_buyer_id      ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id     ON orders(seller_id);
CREATE INDEX idx_orders_status        ON orders(status);
CREATE INDEX idx_orders_order_number  ON orders(order_number);
CREATE INDEX idx_orders_created_at    ON orders(created_at DESC);

-- order_items — snapshot of product at time of purchase
CREATE TABLE order_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES products(id) ON DELETE SET NULL,  -- nullable; product might be deleted
  product_name   TEXT NOT NULL,                                     -- snapshot
  product_price  INTEGER NOT NULL,                                  -- snapshot in kobo
  quantity       INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT order_items_price_positive    CHECK (product_price > 0),
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- order_status_history — immutable audit trail of status changes
CREATE TABLE order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      order_status NOT NULL,
  changed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

-- =============================================================================
-- LOGISTICS
-- =============================================================================

-- shipments
CREATE TABLE shipments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  logistics_partner_id  UUID NOT NULL REFERENCES logistics_partners(id) ON DELETE RESTRICT,
  tracking_number       TEXT,
  status                shipment_status NOT NULL DEFAULT 'assigned',
  pickup_proof_url      TEXT,
  delivery_proof_url    TEXT,
  picked_up_at          TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipments_order_id   ON shipments(order_id);
CREATE INDEX idx_shipments_status     ON shipments(status);
CREATE INDEX idx_shipments_tracking   ON shipments(tracking_number);

-- =============================================================================
-- PAYMENTS & ESCROW
-- =============================================================================

-- payment_transactions — one-to-one or one-to-many with orders (retries allowed)
CREATE TABLE payment_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reference           TEXT NOT NULL UNIQUE,              -- Paystack/Flutterwave reference
  amount              INTEGER NOT NULL,                  -- kobo
  currency            TEXT NOT NULL DEFAULT 'NGN',
  status              payment_status NOT NULL DEFAULT 'pending',
  provider            payment_provider NOT NULL DEFAULT 'paystack',
  provider_reference  TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT payment_tx_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_payment_tx_order_id   ON payment_transactions(order_id);
CREATE INDEX idx_payment_tx_reference  ON payment_transactions(reference);
CREATE INDEX idx_payment_tx_status     ON payment_transactions(status);

-- escrow_ledger — one record per order, tracks escrow lifecycle
CREATE TABLE escrow_ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,                         -- kobo, always equals order total
  status      escrow_status NOT NULL DEFAULT 'initiated',
  released_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT escrow_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_escrow_order_id ON escrow_ledger(order_id);
CREATE INDEX idx_escrow_status   ON escrow_ledger(status);

-- commissions — platform fee captured at order completion
CREATE TABLE commissions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id  UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  rate      NUMERIC(5, 4) NOT NULL,                    -- e.g. 0.0250 for 2.5%
  amount    INTEGER NOT NULL,                          -- kobo
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT commissions_rate_range  CHECK (rate > 0 AND rate <= 1),
  CONSTRAINT commissions_amount_pos  CHECK (amount > 0)
);

-- payouts — seller disbursements after escrow release
CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
  amount          INTEGER NOT NULL,                    -- kobo
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  status          payout_status NOT NULL DEFAULT 'pending',
  reference       TEXT UNIQUE,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT payouts_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_payouts_seller_id ON payouts(seller_id);
CREATE INDEX idx_payouts_status    ON payouts(status);

-- refunds
CREATE TABLE refunds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount       INTEGER NOT NULL,                      -- kobo
  reason       TEXT NOT NULL,
  status       refund_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT refunds_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_status   ON refunds(status);

-- =============================================================================
-- REVIEWS & TRUST
-- =============================================================================

-- reviews — one review per order (buyer reviews seller)
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL,
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT reviews_rating_range CHECK (rating >= 1 AND rating <= 5)
);

CREATE INDEX idx_reviews_seller_id ON reviews(seller_id);
CREATE INDEX idx_reviews_buyer_id  ON reviews(buyer_id);
CREATE INDEX idx_reviews_rating    ON reviews(rating);

-- review_media
CREATE TABLE review_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  media_type  media_type NOT NULL DEFAULT 'image',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_media_review_id ON review_media(review_id);

-- trust_scores — denormalised, recomputed after each review or dispute resolution
CREATE TABLE trust_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL UNIQUE REFERENCES sellers(id) ON DELETE CASCADE,
  average_rating  NUMERIC(3, 2) NOT NULL DEFAULT 0,
  total_reviews   INTEGER NOT NULL DEFAULT 0,
  dispute_rate    NUMERIC(5, 4) NOT NULL DEFAULT 0,    -- ratio: disputes / orders
  on_time_rate    NUMERIC(5, 4) NOT NULL DEFAULT 0,    -- ratio: on-time deliveries / orders
  badge           seller_badge,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT trust_avg_rating_range  CHECK (average_rating >= 0 AND average_rating <= 5),
  CONSTRAINT trust_dispute_rate_pct  CHECK (dispute_rate >= 0 AND dispute_rate <= 1),
  CONSTRAINT trust_ontime_rate_pct   CHECK (on_time_rate >= 0 AND on_time_rate <= 1)
);

-- =============================================================================
-- DISPUTES
-- =============================================================================

-- disputes
CREATE TABLE disputes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  opened_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  reason       TEXT NOT NULL,
  description  TEXT,
  status       dispute_status NOT NULL DEFAULT 'open',
  admin_notes  TEXT,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_order_id   ON disputes(order_id);
CREATE INDEX idx_disputes_opened_by  ON disputes(opened_by);
CREATE INDEX idx_disputes_status     ON disputes(status);

-- dispute_evidence
CREATE TABLE dispute_evidence (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id   UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  file_url     TEXT NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);

-- dispute_messages
CREATE TABLE dispute_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);

-- =============================================================================
-- MESSAGING
-- =============================================================================

-- conversations — buyer ↔ seller, optionally linked to an order
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT conversations_unique UNIQUE (buyer_id, seller_id, order_id)
);

CREATE INDEX idx_conversations_buyer_id  ON conversations(buyer_id);
CREATE INDEX idx_conversations_seller_id ON conversations(seller_id);
CREATE INDEX idx_conversations_order_id  ON conversations(order_id);

-- messages
CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  content          TEXT NOT NULL,
  is_read          BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id       ON messages(sender_id);
CREATE INDEX idx_messages_is_read         ON messages(is_read) WHERE is_read = false;

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL,               -- e.g. 'order_update', 'payment_received', 'dispute_opened'
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id  ON notifications(user_id);
CREATE INDEX idx_notifications_is_read  ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type     ON notifications(type);

-- =============================================================================
-- ADMIN & AUDIT
-- =============================================================================

-- admin_actions — manual actions taken by admins in the dashboard
CREATE TABLE admin_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  action_type  TEXT NOT NULL,              -- e.g. 'approve_seller', 'suspend_product', 'resolve_dispute'
  target_type  TEXT NOT NULL,              -- e.g. 'seller', 'product', 'dispute'
  target_id    UUID NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_actions_admin_id     ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target_id    ON admin_actions(target_id);
CREATE INDEX idx_admin_actions_action_type  ON admin_actions(action_type);

-- audit_logs — automatic application-level audit trail
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID NOT NULL,
  metadata     JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id     ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_id   ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at  ON audit_logs(created_at DESC);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'buyer')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sellers_updated_at
  BEFORE UPDATE ON sellers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_escrow_updated_at
  BEFORE UPDATE ON escrow_ledger
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-record order status changes in history
CREATE OR REPLACE FUNCTION record_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_status_history
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION record_order_status_change();

-- Recompute trust_scores after a review is inserted/updated
CREATE OR REPLACE FUNCTION update_trust_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_avg_rating   NUMERIC(3,2);
  v_total        INTEGER;
BEGIN
  SELECT
    ROUND(AVG(rating)::NUMERIC, 2),
    COUNT(*)
  INTO v_avg_rating, v_total
  FROM reviews
  WHERE seller_id = NEW.seller_id;

  INSERT INTO trust_scores (seller_id, average_rating, total_reviews, updated_at)
  VALUES (NEW.seller_id, v_avg_rating, v_total, now())
  ON CONFLICT (seller_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    total_reviews  = EXCLUDED.total_reviews,
    updated_at     = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_trust_score
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_trust_score();

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_kyc_documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media          ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_partners     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_ledger          ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds                ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_media           ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER: is_admin() — avoids repeated subqueries in policies
-- =============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_seller()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'seller'
  );
$$;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- ---- profiles ---------------------------------------------------------------

CREATE POLICY "profiles: users read own row"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles: users update own row"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));
  -- Prevents self-elevation of role

CREATE POLICY "profiles: admins full access"
  ON profiles FOR ALL
  USING (is_admin());

-- ---- addresses --------------------------------------------------------------

CREATE POLICY "addresses: own rows"
  ON addresses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "addresses: admins read all"
  ON addresses FOR SELECT
  USING (is_admin());

-- ---- sellers ----------------------------------------------------------------

CREATE POLICY "sellers: owner read/update"
  ON sellers FOR SELECT
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "sellers: owner insert"
  ON sellers FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "sellers: owner update own"
  ON sellers FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "sellers: admins full access"
  ON sellers FOR ALL
  USING (is_admin());

CREATE POLICY "sellers: public read approved"
  ON sellers FOR SELECT
  USING (status = 'approved');

-- ---- seller_kyc_documents ---------------------------------------------------

CREATE POLICY "kyc: seller owns their docs"
  ON seller_kyc_documents FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "kyc: admins full access"
  ON seller_kyc_documents FOR ALL
  USING (is_admin());

-- ---- bank_accounts ----------------------------------------------------------

CREATE POLICY "bank_accounts: seller owns"
  ON bank_accounts FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "bank_accounts: admins read"
  ON bank_accounts FOR SELECT
  USING (is_admin());

-- ---- categories -------------------------------------------------------------

CREATE POLICY "categories: public read"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "categories: admins write"
  ON categories FOR ALL
  USING (is_admin());

-- ---- products ---------------------------------------------------------------

CREATE POLICY "products: public read active"
  ON products FOR SELECT
  USING (status = 'active' OR seller_id = auth.uid() OR is_admin());

CREATE POLICY "products: seller manages own"
  ON products FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "products: seller updates own"
  ON products FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "products: seller deletes own"
  ON products FOR DELETE
  USING (seller_id = auth.uid() OR is_admin());

CREATE POLICY "products: admins full access"
  ON products FOR ALL
  USING (is_admin());

-- ---- product_media ----------------------------------------------------------

CREATE POLICY "product_media: public read"
  ON product_media FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_id AND (p.status = 'active' OR p.seller_id = auth.uid())
    )
  );

CREATE POLICY "product_media: seller manages own"
  ON product_media FOR ALL
  USING (
    EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.seller_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.seller_id = auth.uid())
  );

CREATE POLICY "product_media: admins full access"
  ON product_media FOR ALL
  USING (is_admin());

-- ---- carts ------------------------------------------------------------------

CREATE POLICY "carts: own cart"
  ON carts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- cart_items -------------------------------------------------------------

CREATE POLICY "cart_items: own cart items"
  ON cart_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
  );

-- ---- logistics_partners -----------------------------------------------------

CREATE POLICY "logistics_partners: public read active"
  ON logistics_partners FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "logistics_partners: admins full access"
  ON logistics_partners FOR ALL
  USING (is_admin());

-- ---- orders -----------------------------------------------------------------

CREATE POLICY "orders: buyer reads own"
  ON orders FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin());

CREATE POLICY "orders: buyer creates"
  ON orders FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "orders: buyer/seller update status"
  ON orders FOR UPDATE
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin());

CREATE POLICY "orders: admins full access"
  ON orders FOR ALL
  USING (is_admin());

-- ---- order_items ------------------------------------------------------------

CREATE POLICY "order_items: parties read"
  ON order_items FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "order_items: system insert"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.buyer_id = auth.uid()
    )
  );

-- ---- order_status_history ---------------------------------------------------

CREATE POLICY "order_status_history: parties read"
  ON order_status_history FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- ---- shipments --------------------------------------------------------------

CREATE POLICY "shipments: parties read"
  ON shipments FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "shipments: admins full access"
  ON shipments FOR ALL
  USING (is_admin());

CREATE POLICY "shipments: logistics update"
  ON shipments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'logistics'
    )
  );

-- ---- payment_transactions ---------------------------------------------------

CREATE POLICY "payment_tx: buyer reads own"
  ON payment_transactions FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.buyer_id = auth.uid()
    )
  );

CREATE POLICY "payment_tx: admins full access"
  ON payment_transactions FOR ALL
  USING (is_admin());

-- ---- escrow_ledger ----------------------------------------------------------

CREATE POLICY "escrow: parties read"
  ON escrow_ledger FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "escrow: admins full access"
  ON escrow_ledger FOR ALL
  USING (is_admin());

-- ---- commissions ------------------------------------------------------------

CREATE POLICY "commissions: admins only"
  ON commissions FOR ALL
  USING (is_admin());

CREATE POLICY "commissions: seller reads own"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.seller_id = auth.uid()
    )
  );

-- ---- payouts ----------------------------------------------------------------

CREATE POLICY "payouts: seller reads own"
  ON payouts FOR SELECT
  USING (seller_id = auth.uid() OR is_admin());

CREATE POLICY "payouts: admins full access"
  ON payouts FOR ALL
  USING (is_admin());

-- ---- refunds ----------------------------------------------------------------

CREATE POLICY "refunds: parties read"
  ON refunds FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "refunds: admins full access"
  ON refunds FOR ALL
  USING (is_admin());

-- ---- reviews ----------------------------------------------------------------

CREATE POLICY "reviews: public read"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "reviews: buyer writes own"
  ON reviews FOR INSERT
  WITH CHECK (
    buyer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.buyer_id = auth.uid() AND o.status = 'completed'
    )
  );

CREATE POLICY "reviews: buyer updates own"
  ON reviews FOR UPDATE
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "reviews: admins full access"
  ON reviews FOR ALL
  USING (is_admin());

-- ---- review_media -----------------------------------------------------------

CREATE POLICY "review_media: public read"
  ON review_media FOR SELECT
  USING (true);

CREATE POLICY "review_media: buyer adds own"
  ON review_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_id AND r.buyer_id = auth.uid()
    )
  );

CREATE POLICY "review_media: admins full access"
  ON review_media FOR ALL
  USING (is_admin());

-- ---- trust_scores -----------------------------------------------------------

CREATE POLICY "trust_scores: public read"
  ON trust_scores FOR SELECT
  USING (true);

CREATE POLICY "trust_scores: system write"
  ON trust_scores FOR ALL
  USING (is_admin());

-- ---- disputes ---------------------------------------------------------------

CREATE POLICY "disputes: parties read"
  ON disputes FOR SELECT
  USING (
    opened_by = auth.uid() OR is_admin() OR
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "disputes: parties create"
  ON disputes FOR INSERT
  WITH CHECK (
    opened_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "disputes: admins full access"
  ON disputes FOR ALL
  USING (is_admin());

-- ---- dispute_evidence -------------------------------------------------------

CREATE POLICY "dispute_evidence: parties read"
  ON dispute_evidence FOR SELECT
  USING (
    uploaded_by = auth.uid() OR is_admin() OR
    EXISTS (
      SELECT 1 FROM disputes d
      JOIN orders o ON o.id = d.order_id
      WHERE d.id = dispute_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "dispute_evidence: parties upload"
  ON dispute_evidence FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM disputes d
      JOIN orders o ON o.id = d.order_id
      WHERE d.id = dispute_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "dispute_evidence: admins full access"
  ON dispute_evidence FOR ALL
  USING (is_admin());

-- ---- dispute_messages -------------------------------------------------------

CREATE POLICY "dispute_messages: parties read"
  ON dispute_messages FOR SELECT
  USING (
    sender_id = auth.uid() OR is_admin() OR
    EXISTS (
      SELECT 1 FROM disputes d
      JOIN orders o ON o.id = d.order_id
      WHERE d.id = dispute_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "dispute_messages: parties send"
  ON dispute_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM disputes d
      JOIN orders o ON o.id = d.order_id
      WHERE d.id = dispute_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "dispute_messages: admins full access"
  ON dispute_messages FOR ALL
  USING (is_admin());

-- ---- conversations ----------------------------------------------------------

CREATE POLICY "conversations: parties read"
  ON conversations FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin());

CREATE POLICY "conversations: buyer creates"
  ON conversations FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "conversations: admins full access"
  ON conversations FOR ALL
  USING (is_admin());

-- ---- messages ---------------------------------------------------------------

CREATE POLICY "messages: parties read"
  ON messages FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

CREATE POLICY "messages: parties send"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

CREATE POLICY "messages: sender marks read"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

-- ---- notifications ----------------------------------------------------------

CREATE POLICY "notifications: own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "notifications: mark read"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications: admins full access"
  ON notifications FOR ALL
  USING (is_admin());

-- ---- admin_actions ----------------------------------------------------------

CREATE POLICY "admin_actions: admins only"
  ON admin_actions FOR ALL
  USING (is_admin());

-- ---- audit_logs -------------------------------------------------------------

CREATE POLICY "audit_logs: admins read all"
  ON audit_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "audit_logs: users read own"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "audit_logs: system insert"
  ON audit_logs FOR INSERT
  WITH CHECK (true);  -- inserts are driven by server-side functions / service role

-- =============================================================================
-- SEED: Default categories (optional starter data)
-- =============================================================================

INSERT INTO categories (name, slug, icon) VALUES
  ('Electronics',          'electronics',         '📱'),
  ('Fashion',              'fashion',             '👗'),
  ('Home & Living',        'home-living',         '🏠'),
  ('Health & Beauty',      'health-beauty',       '💊'),
  ('Food & Groceries',     'food-groceries',      '🛒'),
  ('Vehicles & Parts',     'vehicles-parts',      '🚗'),
  ('Sports & Outdoors',    'sports-outdoors',     '⚽'),
  ('Books & Stationery',   'books-stationery',    '📚'),
  ('Baby & Kids',          'baby-kids',           '👶'),
  ('Industrial & Business','industrial-business', '🏭')
ON CONFLICT (slug) DO NOTHING;

-- Subcategory examples
INSERT INTO categories (name, slug, icon, parent_id) VALUES
  ('Phones & Tablets',   'phones-tablets',    '📲', (SELECT id FROM categories WHERE slug = 'electronics')),
  ('Laptops & PCs',      'laptops-pcs',       '💻', (SELECT id FROM categories WHERE slug = 'electronics')),
  ('Men''s Clothing',    'mens-clothing',     '👔', (SELECT id FROM categories WHERE slug = 'fashion')),
  ('Women''s Clothing',  'womens-clothing',   '👚', (SELECT id FROM categories WHERE slug = 'fashion')),
  ('Skincare',           'skincare',          '🧴', (SELECT id FROM categories WHERE slug = 'health-beauty'))
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
