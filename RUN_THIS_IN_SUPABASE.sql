-- ============================================
-- Supabase SQL Editor에 이 내용 전체를 붙여넣고 Run 실행
-- ============================================
-- 첫 로그인 = 관리자. 이후 가입 = 학생(기본) 또는 교사(온보딩에서 선택)
CREATE OR REPLACE FUNCTION public.ensure_profile(p_id UUID, p_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_id IS NULL OR p_id != auth.uid() THEN
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, name, role, is_approved)
  SELECT
    p_id,
    NULLIF(TRIM(p_name), ''),
    CASE WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin' ELSE 'student' END,
    CASE WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN true ELSE false END
  ON CONFLICT (id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.ensure_profile(UUID, TEXT) IS '프로필이 없으면 생성. 첫 사용자=admin, 이후=student(기본). 교사는 온보딩에서 선택.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_is_first BOOLEAN;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.email
  );
  SELECT (SELECT COUNT(*) FROM public.profiles) = 0 INTO v_is_first;

  INSERT INTO public.profiles (id, name, role, is_approved)
  VALUES (
    NEW.id,
    v_name,
    CASE WHEN v_is_first THEN 'admin' ELSE 'student' END,
    CASE WHEN v_is_first THEN true ELSE false END
  );
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_profile(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile(UUID, TEXT) TO service_role;

-- ============================================
-- 진로심리검사 결과 테이블 (6종 검사 → AI 진로 피드백·종합 대시보드용)
-- 위 기본 설정 적용 후 필요 시 아래도 실행
-- ============================================
-- (마이그레이션 007과 동일: supabase/migrations/007_career_test_results.sql 참고)
