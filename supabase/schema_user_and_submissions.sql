-- ==============================================================================
-- Nonsul Pass Lab: 사용자 프로필(profiles) 및 학생 답안/채점 리포트(student_submissions) 스키마
-- ==============================================================================

-- 1. 사용자 프로필 테이블 (Supabase auth.users와 1:1 매핑)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '수험생',
  target_university TEXT DEFAULT '미정',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 학생 답안 및 AI 채점 리포트 영구 저장 테이블
CREATE TABLE IF NOT EXISTS public.student_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL,
  exam_title TEXT NOT NULL,
  university TEXT NOT NULL,
  question_label TEXT NOT NULL,
  student_answer TEXT NOT NULL,
  char_count INT DEFAULT 0,
  total_score INT DEFAULT 0,
  status_verdict TEXT DEFAULT '채점 완료',
  grading_report JSONB NOT NULL, -- GradingReportData 전체 구조화 JSON
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 빠른 조회를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.student_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_exam_id ON public.student_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.student_submissions(created_at DESC);

-- 3. 신규 회원가입 시 public.profiles 자동 생성 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, target_university, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', '수험생'),
    COALESCE(NEW.raw_user_meta_data->>'target_university', '홍익대학교'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    target_university = COALESCE(EXCLUDED.target_university, profiles.target_university),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users INSERT 시 트리거 연결
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RLS (Row Level Security) 설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;

-- (1) Profiles RLS 정책
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- (2) Student Submissions RLS 정책
-- 수험생은 본인의 제출 답안만 조회 가능, 관리자는 모든 학생 답안 조회 가능
DROP POLICY IF EXISTS "Users can read own submissions or admin reads all" ON public.student_submissions;
CREATE POLICY "Users can read own submissions or admin reads all" ON public.student_submissions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 수험생은 본인의 답안 제출(INSERT) 가능
DROP POLICY IF EXISTS "Authenticated users can insert own submission" ON public.student_submissions;
CREATE POLICY "Authenticated users can insert own submission" ON public.student_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 수험생은 본인의 답안 삭제 가능
DROP POLICY IF EXISTS "Users can delete own submission" ON public.student_submissions;
CREATE POLICY "Users can delete own submission" ON public.student_submissions
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- 💡 특정 계정을 관리자(admin)로 지정할 때 실행하는 쿼리 (Supabase SQL Editor용)
-- UPDATE public.profiles SET role = 'admin' WHERE email = '관리자이메일@example.com';
-- ==============================================================================
