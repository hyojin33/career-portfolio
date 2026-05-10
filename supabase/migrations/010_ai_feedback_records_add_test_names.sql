-- ai_feedback_records에 검사 종류 저장 컬럼 추가
ALTER TABLE public.ai_feedback_records
ADD COLUMN IF NOT EXISTS test_names TEXT;

COMMENT ON COLUMN public.ai_feedback_records.test_names IS '해당 피드백 생성 시 기준 완료된 검사명 (쉼표 구분)';
