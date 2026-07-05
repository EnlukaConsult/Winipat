-- 025: Pandascrow KYC verification (NIN + NUBAN bank-account lookups).
--
-- Adds an audit table for automated identity checks and a bank_code column so
-- we can run NUBAN lookups. Escrow stays in-house — this is KYC only.
--
-- PII policy (per Pandascrow docs): we NEVER persist the raw NIN. We store only
-- the last 4 digits for reference, the registered name returned by the source,
-- the name-match outcome, and the provider reference.

-- --- bank_accounts: need a bank_code + the name the bank returned ---
alter table bank_accounts add column if not exists bank_code text;
alter table bank_accounts add column if not exists verified_name text;

-- --- KYC check audit trail ---
create table if not exists seller_kyc_checks (
  id                uuid primary key default gen_random_uuid(),
  seller_id         uuid not null references sellers(id) on delete cascade,
  check_type        text not null check (check_type in ('nin', 'nuban', 'bvn', 'cac')),
  provider          text not null default 'pandascrow',
  -- pending: created, not yet resolved; pass/fail: resolved; error: API failure.
  status            text not null default 'pending'
                      check (status in ('pending', 'pass', 'fail', 'error')),
  input_last4       text,              -- last 4 of NIN / account number only
  verified_name     text,             -- registered name returned by the source
  name_match        boolean,          -- did verified_name match the seller input?
  match_score       numeric(4, 3),    -- 0..1 token-set coverage
  provider_reference text,            -- Pandascrow transaction/reference id
  message           text,             -- human-readable status/error
  meta              jsonb,            -- minimal, non-sensitive extras
  created_at        timestamptz not null default now()
);

create index if not exists idx_seller_kyc_checks_seller_id on seller_kyc_checks(seller_id);
create index if not exists idx_seller_kyc_checks_type on seller_kyc_checks(seller_id, check_type);

alter table seller_kyc_checks enable row level security;

-- Sellers can read their own check results; admins can read all. Writes happen
-- via the service role (server route), which bypasses RLS — no user INSERT
-- policy on purpose so clients can't forge a "pass".
create policy "seller_kyc_checks: seller reads own"
  on seller_kyc_checks for select
  using (seller_id = auth.uid());

create policy "seller_kyc_checks: admins read"
  on seller_kyc_checks for select
  using (is_admin());
