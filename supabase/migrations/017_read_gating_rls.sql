-- ============================================================
-- Winipat - Migration 017
-- Per-permission READ gating at the RLS layer.
--
-- WHY: admin pages read sensitive tables DIRECTLY via the session
-- Supabase client (createClient().from("payouts") etc.), so RLS is the
-- real read gate. Migration 016 made is_admin() flow from `admin.access`,
-- which means ANY admin-portal user could still read payouts, escrow,
-- KYC, disputes, etc. — too coarse. This migration rewrites the SELECT
-- policies on the sensitive financial / PII tables so admin reads require
-- the SPECIFIC view permission (with `analytics.view` also allowed on the
-- tables the analytics dashboard aggregates).
--
-- Owner/party read paths are preserved exactly. Admin WRITES are not
-- affected: they go through service-role API routes (createAdminClient,
-- which bypasses RLS) and the per-action requirePermission() guards.
-- The old broad "admins full access" FOR ALL policies are replaced with
-- write-only (INSERT/UPDATE/DELETE) policies so nothing that writes via a
-- session client breaks, while reads are governed solely by the gated
-- SELECT policies.
--
-- SAFETY: super-admin holds every permission, so existing admins keep
-- full read access. Apply migrations 015 + 016 BEFORE this one. Review
-- and test in the Supabase SQL editor before production.
-- ============================================================

-- ---- payouts ----------------------------------------------------------------
DROP POLICY IF EXISTS "payouts: seller reads own"   ON payouts;
DROP POLICY IF EXISTS "payouts: admins full access" ON payouts;

CREATE POLICY "payouts: read"
  ON payouts FOR SELECT
  USING (
    seller_id = auth.uid()
    OR has_permission('payouts.view')
    OR has_permission('analytics.view')
  );
CREATE POLICY "payouts: admin insert" ON payouts FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "payouts: admin update" ON payouts FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "payouts: admin delete" ON payouts FOR DELETE USING (is_admin());

-- ---- escrow_ledger ----------------------------------------------------------
DROP POLICY IF EXISTS "escrow: parties read"        ON escrow_ledger;
DROP POLICY IF EXISTS "escrow: admins full access"  ON escrow_ledger;

CREATE POLICY "escrow: read"
  ON escrow_ledger FOR SELECT
  USING (
    has_permission('settlements.view')
    OR has_permission('analytics.view')
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );
CREATE POLICY "escrow: admin insert" ON escrow_ledger FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "escrow: admin update" ON escrow_ledger FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "escrow: admin delete" ON escrow_ledger FOR DELETE USING (is_admin());

-- ---- payment_transactions ---------------------------------------------------
DROP POLICY IF EXISTS "payment_tx: buyer reads own"    ON payment_transactions;
DROP POLICY IF EXISTS "payment_tx: admins full access" ON payment_transactions;

CREATE POLICY "payment_tx: read"
  ON payment_transactions FOR SELECT
  USING (
    has_permission('payouts.view')
    OR has_permission('settlements.view')
    OR has_permission('analytics.view')
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.buyer_id = auth.uid()
    )
  );
CREATE POLICY "payment_tx: admin insert" ON payment_transactions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "payment_tx: admin update" ON payment_transactions FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "payment_tx: admin delete" ON payment_transactions FOR DELETE USING (is_admin());

-- ---- commissions ------------------------------------------------------------
-- "commissions: seller reads own" stays (no is_admin in it).
DROP POLICY IF EXISTS "commissions: admins only" ON commissions;

CREATE POLICY "commissions: managers read"
  ON commissions FOR SELECT
  USING (
    has_permission('payouts.view')
    OR has_permission('settlements.view')
    OR has_permission('analytics.view')
  );
CREATE POLICY "commissions: admin insert" ON commissions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "commissions: admin update" ON commissions FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "commissions: admin delete" ON commissions FOR DELETE USING (is_admin());

-- ---- refunds ----------------------------------------------------------------
DROP POLICY IF EXISTS "refunds: parties read"       ON refunds;
DROP POLICY IF EXISTS "refunds: admins full access" ON refunds;

CREATE POLICY "refunds: read"
  ON refunds FOR SELECT
  USING (
    has_permission('payouts.view')
    OR has_permission('settlements.view')
    OR has_permission('analytics.view')
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );
CREATE POLICY "refunds: admin insert" ON refunds FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "refunds: admin update" ON refunds FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "refunds: admin delete" ON refunds FOR DELETE USING (is_admin());

-- ---- sellers ----------------------------------------------------------------
-- Keep: "sellers: owner insert", "sellers: owner update own",
--       "sellers: public read approved". Replace owner/admin read + full.
DROP POLICY IF EXISTS "sellers: owner read/update"  ON sellers;
DROP POLICY IF EXISTS "sellers: admins full access" ON sellers;

CREATE POLICY "sellers: read"
  ON sellers FOR SELECT
  USING (
    id = auth.uid()
    OR has_permission('sellers.view')
    OR has_permission('analytics.view')
  );
CREATE POLICY "sellers: admin insert" ON sellers FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "sellers: admin update" ON sellers FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "sellers: admin delete" ON sellers FOR DELETE USING (is_admin());

-- ---- seller_kyc_documents (PII — no analytics access) ------------------------
-- Keep "kyc: seller owns their docs" (owner FOR ALL).
DROP POLICY IF EXISTS "kyc: admins full access" ON seller_kyc_documents;

CREATE POLICY "kyc: reviewers read"
  ON seller_kyc_documents FOR SELECT
  USING (has_permission('sellers.view'));
CREATE POLICY "kyc: admin insert" ON seller_kyc_documents FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "kyc: admin update" ON seller_kyc_documents FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "kyc: admin delete" ON seller_kyc_documents FOR DELETE USING (is_admin());

-- ---- bank_accounts (PII — needed for payouts + KYC) -------------------------
-- Keep "bank_accounts: seller owns" (owner FOR ALL).
DROP POLICY IF EXISTS "bank_accounts: admins read" ON bank_accounts;

CREATE POLICY "bank_accounts: managers read"
  ON bank_accounts FOR SELECT
  USING (has_permission('payouts.view') OR has_permission('sellers.view'));

-- ---- disputes ---------------------------------------------------------------
DROP POLICY IF EXISTS "disputes: parties read"        ON disputes;
DROP POLICY IF EXISTS "disputes: admins full access"  ON disputes;

CREATE POLICY "disputes: read"
  ON disputes FOR SELECT
  USING (
    opened_by = auth.uid()
    OR has_permission('disputes.view')
    OR has_permission('analytics.view')
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );
CREATE POLICY "disputes: admin insert" ON disputes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "disputes: admin update" ON disputes FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "disputes: admin delete" ON disputes FOR DELETE USING (is_admin());

-- ---- dispute_evidence -------------------------------------------------------
DROP POLICY IF EXISTS "dispute_evidence: parties read"       ON dispute_evidence;
DROP POLICY IF EXISTS "dispute_evidence: admins full access" ON dispute_evidence;

CREATE POLICY "dispute_evidence: read"
  ON dispute_evidence FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR has_permission('disputes.view')
    OR EXISTS (
      SELECT 1 FROM disputes d
      JOIN orders o ON o.id = d.order_id
      WHERE d.id = dispute_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );
CREATE POLICY "dispute_evidence: admin insert" ON dispute_evidence FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "dispute_evidence: admin update" ON dispute_evidence FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "dispute_evidence: admin delete" ON dispute_evidence FOR DELETE USING (is_admin());

-- ---- dispute_messages -------------------------------------------------------
DROP POLICY IF EXISTS "dispute_messages: parties read"       ON dispute_messages;
DROP POLICY IF EXISTS "dispute_messages: admins full access" ON dispute_messages;

CREATE POLICY "dispute_messages: read"
  ON dispute_messages FOR SELECT
  USING (
    sender_id = auth.uid()
    OR has_permission('disputes.view')
    OR EXISTS (
      SELECT 1 FROM disputes d
      JOIN orders o ON o.id = d.order_id
      WHERE d.id = dispute_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );
CREATE POLICY "dispute_messages: admin insert" ON dispute_messages FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "dispute_messages: admin update" ON dispute_messages FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "dispute_messages: admin delete" ON dispute_messages FOR DELETE USING (is_admin());

-- ---- support_enquiries ------------------------------------------------------
-- Keep "enquiries: anyone may submit" + "enquiries: user reads own".
DROP POLICY IF EXISTS "enquiries: admins full access" ON support_enquiries;

CREATE POLICY "enquiries: managers read"
  ON support_enquiries FOR SELECT
  USING (has_permission('enquiries.manage'));
CREATE POLICY "enquiries: admin insert" ON support_enquiries FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "enquiries: admin update" ON support_enquiries FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "enquiries: admin delete" ON support_enquiries FOR DELETE USING (is_admin());

NOTIFY pgrst, 'reload schema';
