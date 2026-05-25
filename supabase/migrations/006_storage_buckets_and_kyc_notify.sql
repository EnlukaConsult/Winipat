-- ============================================================
-- Winipat — Migration 006
-- 1. Create the storage buckets the app uploads to
--    (kyc-documents, product-images, product-videos).
--    dispute-evidence was already created manually.
-- 2. RLS on storage.objects so sellers can only touch their own
--    folder and admins can read everything in kyc-documents.
-- 3. Trigger: notify every admin when a seller's status flips to
--    'submitted' or 'under_review' so they can review the KYC.
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Buckets
-- ---------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- KYC docs are PRIVATE — only the seller and admins can read.
  -- Images + PDFs up to 10 MB.
  ('kyc-documents',  'kyc-documents',  false, 10485760,
   ARRAY['image/jpeg','image/png','image/webp','application/pdf']),

  -- Product images are PUBLIC — buyers need to see them on listing
  -- pages without an auth round-trip. 5 MB cap.
  ('product-images', 'product-images', true,  5242880,
   ARRAY['image/jpeg','image/png','image/webp']),

  -- Product videos are PUBLIC, 50 MB cap.
  ('product-videos', 'product-videos', true,  52428800,
   ARRAY['video/mp4','video/quicktime','video/webm']),

  -- Dispute evidence — PRIVATE. Sellers/buyers parties to the
  -- dispute can read; admins can read all.
  ('dispute-evidence','dispute-evidence', false, 10485760,
   ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- 2. RLS on storage.objects
--    Convention: every upload lives at "<user_id>/<filename>" so we
--    can authorise by checking the first folder component.
-- ---------------------------------------------------------------

-- KYC: seller may insert/select/delete in their own folder
DROP POLICY IF EXISTS "kyc seller own" ON storage.objects;
CREATE POLICY "kyc seller own" ON storage.objects FOR ALL
  USING  (bucket_id = 'kyc-documents'
          AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'kyc-documents'
          AND (storage.foldername(name))[1] = auth.uid()::text);

-- KYC: admins read everything
DROP POLICY IF EXISTS "kyc admin read" ON storage.objects;
CREATE POLICY "kyc admin read" ON storage.objects FOR SELECT
  USING  (bucket_id = 'kyc-documents' AND is_admin());

-- Product images: seller manages own folder
DROP POLICY IF EXISTS "product-images seller own" ON storage.objects;
CREATE POLICY "product-images seller own" ON storage.objects FOR ALL
  USING  (bucket_id = 'product-images'
          AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'product-images'
          AND (storage.foldername(name))[1] = auth.uid()::text);

-- Product images: anyone may read (bucket is public, but the policy
-- backs that up if the public flag is ever flipped off)
DROP POLICY IF EXISTS "product-images public read" ON storage.objects;
CREATE POLICY "product-images public read" ON storage.objects FOR SELECT
  USING  (bucket_id = 'product-images');

-- Product videos: same shape as product-images
DROP POLICY IF EXISTS "product-videos seller own" ON storage.objects;
CREATE POLICY "product-videos seller own" ON storage.objects FOR ALL
  USING  (bucket_id = 'product-videos'
          AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'product-videos'
          AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "product-videos public read" ON storage.objects;
CREATE POLICY "product-videos public read" ON storage.objects FOR SELECT
  USING  (bucket_id = 'product-videos');

-- Dispute evidence: uploader writes; uploader + admins read.
-- (Buyer + seller parties to the dispute can already access the file
--  via the file_url stored in dispute_evidence — they don't need direct
--  storage access. Admins do for the review tools.)
DROP POLICY IF EXISTS "dispute-evidence uploader own" ON storage.objects;
CREATE POLICY "dispute-evidence uploader own" ON storage.objects FOR ALL
  USING  (bucket_id = 'dispute-evidence'
          AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'dispute-evidence'
          AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "dispute-evidence admin read" ON storage.objects;
CREATE POLICY "dispute-evidence admin read" ON storage.objects FOR SELECT
  USING  (bucket_id = 'dispute-evidence' AND is_admin());

-- ---------------------------------------------------------------
-- 3. Notify admins when a seller submits KYC
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_admins_on_seller_submit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_business TEXT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status IN ('submitted', 'under_review'))
     OR (TG_OP = 'UPDATE'
         AND NEW.status IN ('submitted', 'under_review')
         AND OLD.status IS DISTINCT FROM NEW.status) THEN

    v_business := COALESCE(NEW.business_name, 'A seller');

    INSERT INTO notifications (user_id, title, body, type, data)
    SELECT p.id,
           'New seller awaiting review',
           v_business || ' submitted their KYC and is ready for review.',
           'system',
           jsonb_build_object('seller_id', NEW.id, 'status', NEW.status)
      FROM profiles p
     WHERE p.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_seller_submit ON sellers;
CREATE TRIGGER trg_notify_admins_on_seller_submit
  AFTER INSERT OR UPDATE ON sellers
  FOR EACH ROW EXECUTE FUNCTION notify_admins_on_seller_submit();
