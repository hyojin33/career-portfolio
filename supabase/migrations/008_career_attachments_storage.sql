-- ============================================
-- 진로 검사 첨부 파일 저장용 Storage 버킷 및 RLS
-- 경로: {user_id}/{test_id}/{unique}_{filename}
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'career-attachments',
  'career-attachments',
  false,
  10485760,  -- 10MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 본인 폴더에만 업로드 허용 (경로 첫 번째 세그먼트 = auth.uid())
CREATE POLICY "career_attachments_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'career-attachments'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

-- 본인 폴더 파일만 조회
CREATE POLICY "career_attachments_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'career-attachments'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

-- 본인 폴더 파일만 삭제
CREATE POLICY "career_attachments_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'career-attachments'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

-- 본인 폴더 파일만 업데이트 (메타 등)
CREATE POLICY "career_attachments_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'career-attachments'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);
