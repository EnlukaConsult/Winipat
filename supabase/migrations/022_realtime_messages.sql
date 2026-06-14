-- ============================================================
-- Winipat - Migration 022
-- Enable Supabase Realtime for buyer<->seller messaging.
--
-- The messages page subscribes to postgres_changes on `messages`, but the
-- table wasn't in the `supabase_realtime` publication, so no events were
-- delivered — neither party saw new messages live. Add messages (and
-- conversations) to the publication. Guarded so re-running is safe.
--
-- (The sender now also appends optimistically client-side, so they see their
-- own message even without realtime; this makes the OTHER party live too.)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;
