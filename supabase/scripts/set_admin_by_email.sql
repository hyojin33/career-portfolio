-- ============================================
-- 특정 이메일을 관리자(admin)로 설정
-- Supabase 대시보드 → SQL Editor에서 이 파일 내용을 붙여넣고 실행하세요.
-- ============================================

-- jeunmong03@gmail.com 계정을 관리자로 설정
UPDATE public.profiles
SET role = 'admin', is_approved = true, updated_at = now()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'jeunmong03@gmail.com'
);

-- 적용된 행이 있는지 확인 (1 row가 나오면 성공)
SELECT id, role, is_approved FROM public.profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'jeunmong03@gmail.com');
