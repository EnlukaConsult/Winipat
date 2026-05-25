-- ============================================================
-- Winipat — Migration 008
-- Public 'avatars' storage bucket for profile pictures.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 2097152,
   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Convention: each user uploads under "<user_id>/<filename>", so we
-- authorise writes by checking the first folder segment.

DROP POLICY IF EXISTS "avatars owner write" ON storage.objects;
CREATE POLICY "avatars owner write" ON storage.objects FOR ALL
  USING  (bucket_id = 'avatars'
          AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars'
          AND (storage.foldername(name))[1] = auth.uid()::text);

-- Avatars are public — anyone can read so they render across the
-- platform (header dropdown, comments, seller pages) without auth.
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read" ON storage.objects FOR SELECT
  USING  (bucket_id = 'avatars');
