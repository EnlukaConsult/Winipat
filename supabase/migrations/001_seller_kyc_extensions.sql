-- ============================================================
-- Winipat — Migration 001
-- Seller KYC extensions to match the FRD v1.0 onboarding spec.
--
-- Run this once in the Supabase SQL editor (safe to re-run — additive only).
-- ============================================================

-- 1. Structured pickup address (FR-SEL-002: state + city are searchable for logistics)
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS pickup_city  TEXT,
  ADD COLUMN IF NOT EXISTS pickup_state TEXT;

-- 2. Platform + escrow agreement acceptance (BR-050)
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS terms_accepted_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escrow_agreement_accepted_at TIMESTAMPTZ;

-- 3. Appeal tracking — spec allows max 1 appeal per KYC rejection (Swimlane)
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS appeal_count INTEGER NOT NULL DEFAULT 0;

-- Index pickup_state for logistics partner / admin filtering
CREATE INDEX IF NOT EXISTS idx_sellers_pickup_state ON sellers(pickup_state);
