-- ==============================================================================
-- exams 테이블에 문항 및 제시문 본문 저장을 위한 questions JSONB 컬럼 추가 SQL
-- Supabase 대시보드 -> SQL Editor 에서 본 쿼리를 실행해 주세요.
-- ==============================================================================

ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS questions JSONB;

-- RLS 정책 확인 (이미 exams에 Public Read가 걸려있으므로 questions 컬럼도 자동 공개 읽기 허용)
COMMENT ON COLUMN public.exams.questions IS '문항별 발문, 제시문(지문), 모범답안, 세부 배점기준표 JSON 배열';
