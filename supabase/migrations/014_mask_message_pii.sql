-- ============================================================
-- Winipat - Migration 014
-- Mask PII (phone numbers, emails, links, social handles) in
-- buyer <-> seller messages.  (FR-BYR-050 / 052 / 053)
--
-- WHY AT THE DB LAYER:
--   Messages are inserted CLIENT-SIDE, straight into the
--   `messages` table via the Supabase REST API
--   (src/app/(dashboard)/dashboard/messages/page.tsx -> sendMessage()).
--   There is no server route in the path we can rely on, so any
--   masking done only in the React app is trivially bypassed by
--   calling the REST endpoint directly. A BEFORE INSERT/UPDATE
--   trigger is the single chokepoint every write must pass through.
--
-- BEHAVIOUR:
--   Detected contact details / off-platform links are replaced
--   with the literal token '[hidden]'. We mask (not reject) so the
--   conversation still flows; the client shows a live hint so the
--   sender knows their details were stripped.
--
-- Idempotent: CREATE OR REPLACE for functions, DROP IF EXISTS for
-- the trigger, and the backfill is safe to re-run (masking masked
-- text is a no-op).
-- ============================================================

-- ------------------------------------------------------------
-- Core masking function. IMMUTABLE so it can be used anywhere.
-- Order matters: emails and URLs are consumed before the phone
-- pass so digit-bearing URLs aren't half-masked.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION mask_message_pii(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result TEXT := input;
BEGIN
  IF result IS NULL THEN
    RETURN result;
  END IF;

  -- 1) Email addresses
  result := regexp_replace(
    result,
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',
    '[hidden]', 'gi');

  -- 2) URLs with an explicit scheme or www.
  result := regexp_replace(
    result,
    '(https?://|www\.)[^[:space:]]+',
    '[hidden]', 'gi');

  -- 3) Bare domains ending in a common TLD (e.g. "find me on jiji.ng")
  result := regexp_replace(
    result,
    '[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.(com|net|org|ng|io|co|me|app|store|info|biz|online|shop|link|xyz|gg)(/[^[:space:]]*)?',
    '[hidden]', 'gi');

  -- 4) Phone numbers: optional +, then a run of digits / spaces /
  --    dashes / dots / parentheses with at least ~9 digits total.
  --    (Commas and the naira sign aren't in the class, so prices
  --    like "₦2,500" are left intact.)
  result := regexp_replace(
    result,
    '\+?[0-9][0-9[:space:]().-]{7,}[0-9]',
    '[hidden]', 'g');

  -- 5) Social / messaging handles (@username)
  result := regexp_replace(
    result,
    '@[A-Za-z0-9_.]{3,}',
    '[hidden]', 'g');

  RETURN result;
END;
$$;

-- ------------------------------------------------------------
-- Trigger wrapper + attachment to messages.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_mask_message_content()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.content := mask_message_pii(NEW.content);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mask_message_content ON messages;
CREATE TRIGGER mask_message_content
  BEFORE INSERT OR UPDATE OF content ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trg_mask_message_content();

-- ------------------------------------------------------------
-- Backfill existing rows so historical PII is scrubbed too.
-- Only touch rows that actually change to avoid needless writes.
-- ------------------------------------------------------------
UPDATE messages
SET content = mask_message_pii(content)
WHERE content IS DISTINCT FROM mask_message_pii(content);
