-- ==============================================================================
-- Nonsul Pass Lab: QnA 질문 및 건의 게시판 테이블 (qna_posts) 스키마 및 RLS 정책
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.qna_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT '수험생',
  category TEXT NOT NULL DEFAULT '질문',          -- '질문' | '건의' | '오류신고' | '기타'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,      -- 비밀글 여부 (true: 본인 및 관리자만 열람)
  status TEXT NOT NULL DEFAULT 'WAIT',            -- 'WAIT' (답변 대기) | 'ANSWERED' (답변 완료)
  admin_reply TEXT,                               -- 관리자 답변 내용
  replied_at TIMESTAMPTZ,                         -- 관리자 답변 등록 일시
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 최신 글 우선 정렬 및 사용자별 조회 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_qna_posts_created_at ON public.qna_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qna_posts_user_id ON public.qna_posts(user_id);

-- Row Level Security (RLS) 활성화
ALTER TABLE public.qna_posts ENABLE ROW LEVEL SECURITY;

-- 1. 조회 정책: 공개글이거나, 작성자 본인이거나, 관리자(role='admin')인 경우 조회 허용
DROP POLICY IF EXISTS "Anyone can view public qna posts" ON public.qna_posts;
CREATE POLICY "Anyone can view public qna posts"
  ON public.qna_posts FOR SELECT
  USING (
    is_private = false
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 2. 등록 정책: 로그인한 사용자 본인 ID로만 작성 가능
DROP POLICY IF EXISTS "Authenticated users can insert qna posts" ON public.qna_posts;
CREATE POLICY "Authenticated users can insert qna posts"
  ON public.qna_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. 수정 정책: 작성자 본인 또는 관리자만 수정(답변 등록 포함) 가능
DROP POLICY IF EXISTS "Authors and admins can update qna posts" ON public.qna_posts;
CREATE POLICY "Authors and admins can update qna posts"
  ON public.qna_posts FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 4. 삭제 정책: 작성자 본인 또는 관리자만 삭제 가능
DROP POLICY IF EXISTS "Authors and admins can delete qna posts" ON public.qna_posts;
CREATE POLICY "Authors and admins can delete qna posts"
  ON public.qna_posts FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
