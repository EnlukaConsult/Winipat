-- ============================================================
-- Winipat — Migration 009
-- Adds seller_type to profiles for capturing "individual" vs
-- "business" intent during onboarding, before the user reaches
-- the full KYC step that creates a sellers row.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS seller_type TEXT
  CHECK (seller_type IS NULL OR seller_type IN ('individual', 'business'));

-- Note: deliberately nullable. Buyers won't have a value here, and
-- existing seller profiles created before this migration also won't.
-- The KYC flow asks again at submission time and persists the final
-- choice on the sellers table.

COMMENT ON COLUMN profiles.seller_type IS
  'Onboarding intent: individual or business. Optional — only set when ' ||
  'the user picks ''Sell'' on /welcome. Final value is captured at KYC.';
