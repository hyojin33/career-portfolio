-- ============================================
-- profiles: auth.users와 1:1 연동 (학생 프로필)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  school_name TEXT,
  major TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스: 이름/학교 검색 등에 활용
CREATE INDEX IF NOT EXISTS idx_profiles_school_name ON public.profiles(school_name);

COMMENT ON TABLE public.profiles IS '학생 프로필 (auth.users와 1:1)';
COMMENT ON COLUMN public.profiles.id IS 'auth.users.id와 동일 (Supabase Auth 연동)';

-- ============================================
-- activity_logs: 사용자 행동 로그 (profiles와 N:1)
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  page_url TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스: 사용자별·시간순 조회
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);

COMMENT ON TABLE public.activity_logs IS '학생 행동 로그 (로그인/클릭/입력 등)';
COMMENT ON COLUMN public.activity_logs.action_type IS '예: login, click, input, page_view';
COMMENT ON COLUMN public.activity_logs.details IS '상세 내용 (JSON, 유연한 구조)';

-- ============================================
-- RLS (Row Level Security) 활성화
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- profiles: 본인만 읽기/수정
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- activity_logs: 본인만 읽기, 본인만 삽입 (수정/삭제 불가로 로그 무결성 유지)
CREATE POLICY "Users can read own activity_logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity_logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- (선택) 새 로그인 사용자 시 프로필 자동 생성
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 새 사용자 생성 시 profiles 행 자동 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
