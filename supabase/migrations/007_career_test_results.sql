-- ============================================
-- career_test_results: 진로심리검사 결과 (AI 진로 피드백·종합 대시보드용)
-- ============================================
CREATE TABLE IF NOT EXISTS public.career_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  test_name TEXT NOT NULL,
  qestrn_seq TEXT,
  summary JSONB NOT NULL DEFAULT '{}',
  raw_result JSONB,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, test_id)
);

CREATE INDEX IF NOT EXISTS idx_career_test_results_user_id ON public.career_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_career_test_results_completed_at ON public.career_test_results(completed_at DESC);

COMMENT ON TABLE public.career_test_results IS '진로심리검사 6종 결과 저장 (AI 진로 설계 어드바이저·종합 대시보드 활용)';

ALTER TABLE public.career_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own career_test_results"
  ON public.career_test_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career_test_results"
  ON public.career_test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career_test_results"
  ON public.career_test_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all career_test_results"
  ON public.career_test_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
