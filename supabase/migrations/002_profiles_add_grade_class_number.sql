-- ============================================
-- profiles에 학년, 반, 번호 컬럼 추가 (온보딩용)
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS class_number TEXT,
  ADD COLUMN IF NOT EXISTS student_number TEXT;

COMMENT ON COLUMN public.profiles.grade IS '학년';
COMMENT ON COLUMN public.profiles.class_number IS '반';
COMMENT ON COLUMN public.profiles.student_number IS '번호';
