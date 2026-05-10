-- ============================================
-- 첫 로그인 = 관리자. 이후 가입 = 학생(기본) 또는 교사(온보딩에서 선택)
-- ============================================

-- 프로필이 없을 때 한 건 생성. profiles가 비어 있으면 admin, 아니면 student
CREATE OR REPLACE FUNCTION public.ensure_profile(p_id UUID, p_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 본인만 자신의 프로필 생성 가능
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

-- 트리거: 새 가입 시 동일 로직 사용 (첫 명 = admin)
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

-- RPC 호출 권한: 로그인한 사용자가 본인 id로만 호출 가능 (함수 내부에서 체크)
GRANT EXECUTE ON FUNCTION public.ensure_profile(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile(UUID, TEXT) TO service_role;
