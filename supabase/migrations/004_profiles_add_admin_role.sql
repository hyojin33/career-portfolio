-- ============================================
-- profiles role 컬럼에 admin 역할 추가
-- ============================================
-- 기존 CHECK 제약조건 제거
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 새로운 CHECK 제약조건 추가 (admin 포함)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'teacher', 'admin'));

COMMENT ON COLUMN public.profiles.role IS '사용자 역할: student(학생), teacher(교사), admin(관리자)';

-- ============================================
-- RLS 정책: 관리자는 모든 프로필 읽기/업데이트 가능
-- ============================================
-- 관리자는 모든 프로필 읽기 가능
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자는 모든 프로필 업데이트 가능
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
