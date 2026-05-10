-- ============================================
-- profiles에 역할(role), 교사 필드, 승인 상태 추가
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS affiliation TEXT,
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.role IS '사용자 역할: student(학생), teacher(교사), admin(관리자)';
COMMENT ON COLUMN public.profiles.position IS '교사 직급 (교사인 경우)';
COMMENT ON COLUMN public.profiles.affiliation IS '교사 소속 (교사인 경우)';
COMMENT ON COLUMN public.profiles.is_approved IS '관리자 승인 여부';

-- 인덱스: 역할별 조회
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
