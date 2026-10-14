-- ==============================================================================
-- 📄 exams 테이블에 원본 문제지 PDF 첨부용 컬럼 추가 마이그레이션 SQL
-- ==============================================================================

-- 1. exams 테이블에 pdf_url (파일 접근 경로/URL) 및 pdf_name (원본 파일명) 컬럼 추가
ALTER TABLE public.exams 
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_name TEXT;

-- 2. 컬럼 설명 주석 추가
COMMENT ON COLUMN public.exams.pdf_url IS '관리자가 첨부한 해당 시험의 문제지 원본 PDF 웹 접근 경로 또는 URL';
COMMENT ON COLUMN public.exams.pdf_name IS '사용자가 업로드한 원본 문제지 PDF 파일명 (예: 2026_경희대_인문_모의논술_문제지.pdf)';
