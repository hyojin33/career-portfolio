-- ============================================
-- RLS: 관리자 정책이 같은 테이블(profiles)을 서브쿼리로 읽어서
--      다른 행(학생)이 안 보이는 문제 수정.
--      SECURITY DEFINER 함수로 "현재 사용자 = admin"만 검사하도록 변경.
-- ============================================

-- 현재 로그인한 사용자가 admin인지 반환 (RLS 우회하여 profiles만 읽음)
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.current_user_is_admin() IS 'RLS 정책용: 현재 사용자 프로필의 role이 admin인지 여부';

-- 기존 정책 제거 후 함수 사용하도록 재생성
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.current_user_is_admin());
