-- ============================================================
-- Winipat — Migration 002
-- Order fulfilment additions for the seller portal Phase 2 spec.
--
-- Run this once in the Supabase SQL editor.
-- Safe to re-run (additive only).
-- ============================================================

-- 1. Add 'seller_preparing' to order_status — the intermediate state between
--    payment_confirmed (order placed + paid) and awaiting_pickup (seller ready).
--    FRD FR-SEL-027: seller accepts -> order moves to seller_preparing.
--    FRD FR-SEL-028: seller marks Ready -> moves to awaiting_pickup.
--
--    Note: PG enums can't be modified inside a transaction, so this MUST run
--    as a standalone statement. Supabase SQL Editor handles this automatically.
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'seller_preparing' AFTER 'payment_confirmed';

-- 2. Order-level fulfilment timestamps + package proof
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS accepted_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS package_photo_url  TEXT;

-- Index by status so the seller's tab queries stay snappy as volume grows
CREATE INDEX IF NOT EXISTS idx_orders_seller_status_created
  ON orders(seller_id, status, created_at DESC);
