-- ============================================================
-- Winipat — Migration 007
-- Support enquiries: lets visitors / signed-in users send a
-- structured question to support@winipat.com. Admins see the
-- queue at /admin/enquiries. Notifications wake them up.
-- ============================================================

CREATE TYPE enquiry_status   AS ENUM ('new', 'in_progress', 'resolved', 'spam');
CREATE TYPE enquiry_category AS ENUM (
  'order_issue',
  'payment',
  'seller_application',
  'kyc_question',
  'dispute_help',
  'partnership',
  'feedback',
  'other'
);

CREATE TABLE support_enquiries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL = anon submission
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  category     enquiry_category NOT NULL DEFAULT 'other',
  subject      TEXT NOT NULL,
  message      TEXT NOT NULL,
  chat_context TEXT,                                            -- optional: pasted chat transcript
  status       enquiry_status NOT NULL DEFAULT 'new',
  admin_notes  TEXT,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT enquiry_email_check CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  CONSTRAINT enquiry_subject_len CHECK (length(subject) BETWEEN 3 AND 200),
  CONSTRAINT enquiry_message_len CHECK (length(message) BETWEEN 10 AND 5000)
);

CREATE INDEX idx_support_enquiries_status     ON support_enquiries(status);
CREATE INDEX idx_support_enquiries_created_at ON support_enquiries(created_at DESC);
CREATE INDEX idx_support_enquiries_user_id    ON support_enquiries(user_id);

CREATE TRIGGER trg_support_enquiries_updated_at
  BEFORE UPDATE ON support_enquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE support_enquiries ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthed) may insert — the API route does the rate
-- limiting + validation. RLS lets the public form work without auth.
CREATE POLICY "enquiries: anyone may submit"
  ON support_enquiries FOR INSERT
  WITH CHECK (true);

-- Signed-in users can read their own submissions
CREATE POLICY "enquiries: user reads own"
  ON support_enquiries FOR SELECT
  USING (user_id = auth.uid());

-- Admins read + update all
CREATE POLICY "enquiries: admins full access"
  ON support_enquiries FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------
-- Notify admins on new enquiry
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_admins_on_new_enquiry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'new' THEN
    INSERT INTO notifications (user_id, title, body, type, data)
    SELECT p.id,
           'New support enquiry',
           NEW.name || ': ' || NEW.subject,
           'system',
           jsonb_build_object('enquiry_id', NEW.id, 'category', NEW.category)
      FROM profiles p
     WHERE p.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_new_enquiry ON support_enquiries;
CREATE TRIGGER trg_notify_admins_on_new_enquiry
  AFTER INSERT ON support_enquiries
  FOR EACH ROW EXECUTE FUNCTION notify_admins_on_new_enquiry();
