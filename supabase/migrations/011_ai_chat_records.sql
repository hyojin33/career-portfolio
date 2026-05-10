-- ============================================
-- ai_chat_records: AI 챗봇 채팅 기록 (날짜별 저장·조회·삭제)
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_chat_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_records_user_id ON public.ai_chat_records(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_records_created_at ON public.ai_chat_records(created_at DESC);

COMMENT ON TABLE public.ai_chat_records IS 'AI 챗봇 채팅 기록 (날짜별 저장·조회·삭제)';

ALTER TABLE public.ai_chat_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ai_chat_records"
  ON public.ai_chat_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_chat_records"
  ON public.ai_chat_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai_chat_records"
  ON public.ai_chat_records FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all ai_chat_records"
  ON public.ai_chat_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
