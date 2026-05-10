-- ============================================
-- learning_progress: 학습 영역별 진행률 (학습 플랫폼 연동)
-- ============================================
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  area_index SMALLINT NOT NULL CHECK (area_index >= 0 AND area_index <= 3),
  sub_index SMALLINT NOT NULL CHECK (sub_index >= 0 AND sub_index <= 4),
  value SMALLINT NOT NULL DEFAULT 0 CHECK (value >= 0 AND value <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, area_index, sub_index)
);

CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON public.learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_updated_at ON public.learning_progress(updated_at DESC);

COMMENT ON TABLE public.learning_progress IS '진로 포트폴리오 영역별 진행률 (관리자 시각화용)';

ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

-- 본인만 읽기/삽입/업데이트
CREATE POLICY "Users can read own learning_progress"
  ON public.learning_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning_progress"
  ON public.learning_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning_progress"
  ON public.learning_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- 관리자는 전체 조회 가능 (시각화용)
CREATE POLICY "Admins can read all learning_progress"
  ON public.learning_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- activity_logs: 관리자 전체 조회 정책 추가
-- ============================================
CREATE POLICY "Admins can read all activity_logs"
  ON public.activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
