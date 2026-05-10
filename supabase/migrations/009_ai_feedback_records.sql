-- ============================================
-- ai_feedback_records: AI 종합 진로 피드백 기록
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_feedback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_records_user_id ON public.ai_feedback_records(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_records_created_at ON public.ai_feedback_records(created_at DESC);

COMMENT ON TABLE public.ai_feedback_records IS 'AI 종합 진로 피드백 저장 기록 (조회·삭제 지원)';

ALTER TABLE public.ai_feedback_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ai_feedback_records"
  ON public.ai_feedback_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_feedback_records"
  ON public.ai_feedback_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai_feedback_records"
  ON public.ai_feedback_records FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all ai_feedback_records"
  ON public.ai_feedback_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
