-- ==============================================================================
-- Nonsul Pass Lab: Supabase DB 스키마 생성 및 홍익대학교 초기 데이터 Seed SQL
-- ==============================================================================

-- 1. 대학 기본 정보 테이블
CREATE TABLE IF NOT EXISTS public.universities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  faculty TEXT,
  exam_duration TEXT,
  total_questions TEXT,
  char_per_question TEXT,
  exam_format TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 시험 목록 마스터 테이블 (탭 1: 기출 / 모의 / 예상 문제)
CREATE TABLE IF NOT EXISTS public.exams (
  id TEXT PRIMARY KEY,
  univ_id TEXT REFERENCES public.universities(id) ON DELETE CASCADE,
  year TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- '기출문제', '모의논술', '예상문제'
  target_faculty TEXT,
  total_time INT DEFAULT 120,
  total_length TEXT,
  level TEXT,
  summary TEXT,
  questions JSONB, -- 문항별 상세 정보(제시문, 발문, 모범답안, 세부채점표) 배열
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 기존 테이블에 questions 컬럼 추가 (마이그레이션 안전 보장)
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS questions JSONB;

-- 3. 출제 경향 및 유형 분석 테이블 (탭 2)
CREATE TABLE IF NOT EXISTS public.university_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  univ_id TEXT REFERENCES public.universities(id) ON DELETE CASCADE,
  question_number TEXT NOT NULL,
  question_type TEXT NOT NULL,
  exam_time TEXT,
  score_weight TEXT,
  question_template TEXT,
  passage_structure JSONB,
  description TEXT,
  writing_formula JSONB,
  frequent_themes TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 모집단위별 배점 체계 테이블 (탭 3 상단)
CREATE TABLE IF NOT EXISTS public.scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  univ_id TEXT REFERENCES public.universities(id) ON DELETE CASCADE,
  faculty TEXT NOT NULL,
  chip TEXT,
  score TEXT NOT NULL,
  sub_desc TEXT,
  display_order INT DEFAULT 0
);

-- 5. 공식 채점 기준표 루브릭 테이블 (탭 3 하단)
CREATE TABLE IF NOT EXISTS public.university_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  univ_id TEXT REFERENCES public.universities(id) ON DELETE CASCADE,
  ratio TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  details TEXT[],
  display_order INT DEFAULT 0
);

-- ------------------------------------------------------------------------------
-- RLS (Row Level Security) 설정 및 조회 권한 부여 (공개 읽기 허용)
-- ------------------------------------------------------------------------------
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_rubrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Universities" ON public.universities;
CREATE POLICY "Public Read Universities" ON public.universities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Exams" ON public.exams;
CREATE POLICY "Public Read Exams" ON public.exams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Trends" ON public.university_trends;
CREATE POLICY "Public Read Trends" ON public.university_trends FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Scoring" ON public.scoring_rules;
CREATE POLICY "Public Read Scoring" ON public.scoring_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Rubrics" ON public.university_rubrics;
CREATE POLICY "Public Read Rubrics" ON public.university_rubrics FOR SELECT USING (true);

-- ==============================================================================
-- 홍익대학교 기본 데이터 INSERT (SEED DATA)
-- ==============================================================================

-- 1. 대학 기본 정보
INSERT INTO public.universities (id, name, faculty, exam_duration, total_questions, char_per_question, exam_format, is_active)
VALUES (
  'hongik',
  '홍익대학교',
  '인문계열 / 사범대학 / 예술학과 / 법학부 / 경제학부 / 경영대학 / 자율전공',
  '120분 (문항당 60분 권장)',
  '2문항 (문항당 독립 제시문 4~5개 구성: 1번 (가)~(라), 2번 (마)~(아))',
  '각 800±100자',
  '원고지 완결형 (서론-본론-결론의 유기적 구성)',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  exam_duration = EXCLUDED.exam_duration,
  char_per_question = EXCLUDED.char_per_question,
  is_active = EXCLUDED.is_active;

-- 2. 탭 3: 모집단위별 문항 배점 가중치 카드 (3개)
DELETE FROM public.scoring_rules WHERE univ_id = 'hongik';
INSERT INTO public.scoring_rules (univ_id, faculty, chip, score, sub_desc, display_order)
VALUES
(
  'hongik',
  '사범대학 · 예술학과',
  '인문학 집중',
  '문제 1 가중 · 60점 배점',
  '국어, 문학, 윤리, 역사 제재 중심의 인문학적 독해 및 다각도 관점 대조 능력을 중점 평가합니다.',
  1
),
(
  'hongik',
  '경영대학 · 경제학부 · 법학부',
  '사회과학 집중',
  '문제 2 가중 · 문제 1의 2배',
  '경제, 법과 정치 제재의 사회적 원리를 실제 현실 쟁점에 적용하고 실효성 있는 대안을 도출하는 능력을 집중 평가합니다.',
  2
),
(
  'hongik',
  '캠퍼스자율전공 (인문)',
  '균형 평가',
  '문제 1: 45점 / 문제 2: 55점',
  '인문학적 비판 사고와 사회과학적 정책 대안 분석 역량을 고르게 종합 평가합니다.',
  3
);

-- 3. 탭 3: 출제위원회 공식 채점 기준표 루브릭 (4개)
DELETE FROM public.university_rubrics WHERE univ_id = 'hongik';
INSERT INTO public.university_rubrics (univ_id, ratio, category, description, details, display_order)
VALUES
(
  'hongik',
  '50~60%',
  '1. 제시문 분석 및 발문 요구조건 완수',
  '문항의 발문이 요구한 각 제시문별 분석 과제를 빠짐없이 균형 있게 서술하였는가',
  ARRAY[
    '문제 1: (가)~(라) 4개 제시문별 분석 항목(각 10~20% 배점)을 누락 없이 균형 있게 서술',
    '문제 2: (마)의 원리를 (바)~(아)의 각 사례와 정확하게 매칭하여 논거 제시',
    '제시문에 나타나지 않은 불필요한 사족, 배경지식, 자의적 사례 남용 시 감점 적용'
  ],
  1
),
(
  'hongik',
  '20~30%',
  '2. 입체적 관점 차이 및 대안의 한계 성찰',
  '단순 요약을 넘어 개념 간의 입체적 차이를 규명하거나 정책 대안의 딜레마를 서술했는가',
  ARRAY[
    '문제 1: 단순 긍·부정 구별을 넘어 시대적 맥락, 가치관의 전환, 대안적 시각을 결론에서 종합',
    '문제 2: 이분법적 사고를 탈피하여 정책 대안을 제시하되, 그 대안이 지닌 한계(규제로 인한 언론 자유 침해, 과도한 상속세의 기업 위축 등)까지 복합적으로 서술'
  ],
  2
),
(
  'hongik',
  '치명적 감점 방지',
  '3. 철저한 자기 언어화 (Paraphrasing)',
  '제시문 문장을 그대로 옮겨 적지 않고, 자신의 개념어와 문장으로 재구성했는가',
  ARRAY[
    '제시문의 내용을 자신의 문장으로 풀어내지 못하고 한 문장 이상 그대로 옮겨 적는 경우 감점',
    '단, 논지 전개에 꼭 필요한 핵심 개념어는 따옴표(“ ”) 인용부호 사용 시 정상 인정'
  ],
  3
),
(
  'hongik',
  '10~20%',
  '4. 글의 완결도 및 원고지 형식 요건',
  '서론-본론-결론을 갖춘 한 편의 완결된 글, 규정 글자 수 및 문단 구분 준수',
  ARRAY[
    '규정 글자 수: 800±100자 (700자 미만 또는 900자 초과 시 단계별 감점)',
    '문단 구분을 하지 않거나 비문이 많은 경우 감점 적용'
  ],
  4
);

-- 4. 탭 2: 출제 경향 및 유형 분석 (문항 1, 문항 2)
DELETE FROM public.university_trends WHERE univ_id = 'hongik';
INSERT INTO public.university_trends (
  univ_id, question_number, question_type, exam_time, score_weight, question_template,
  passage_structure, description, writing_formula, frequent_themes
)
VALUES
(
  'hongik',
  '문제 1 유형',
  '인문학적 기준 개념 분석 및 다각도 비교·대조형',
  '60분 권장 / 800±100자 (700~900자 엄수)',
  '사범·예술 60점 / 자율전공 45점 / 법학·상경 30~50점',
  '“제시문 (가)의 [기준 개념/원리/관점]을 설명하고, 이를 바탕으로 (나), (다), (라)에 나타난 현상이나 관점을 분석·평가하시오.”',
  '{"base": "제시문 (가) [기준틀]: 인문·사회·철학 교과서 핵심 개념 (집중/분산, 기록의 3요소, 고전적/대안적 범주관, 역사 서술의 속성 등)", "targets": "제시문 (나)~(라) [적용 대상]: 문학, 역사, 어문, 예술 등 서로 다른 영역의 구체적 현상 및 텍스트 사례"}'::jsonb,
  '인문·사회·예술·역사 등 서로 다른 영역의 4개 제시문을 (가)의 핵심 개념이라는 공통 잣대로 비교·분석하고, 시대적 흐름이나 관점의 입체적 차이를 결론에서 종합하는 정통 인문학 분석 유형입니다.',
  '[{"step": "1단계: 서론·기준틀", "title": "기준 개념 명확 도출", "desc": "제시문 (가)에서 2~3가지 핵심 하위 잣대(분류 기준)를 명확하게 추출하여 정의", "charGuide": "약 150자"}, {"step": "2단계: 본론·적용분석", "title": "1:1 대응 균형 분석", "desc": "(나), (다), (라) 각 텍스트를 (가)의 기준 잣대에 1:1로 매칭하여 누락 없이 서술", "charGuide": "각 150~200자 (총 450~500자)"}, {"step": "3단계: 결론·종합평가", "title": "입체적 대조 및 성찰", "desc": "단순 요약을 넘어 제시문 간 공통점·차이점, 시대적 맥락 변화, 혹은 편견·한계를 비판하며 완결", "charGuide": "약 150~200자"}]'::jsonb,
  ARRAY['집중과 분산', '기록의 3요소', '고전적·대안적 범주관', '역사 서술의 취사선택과 굴절', '4대 윤리적 접근법', '문화 변동 요인']
),
(
  'hongik',
  '문제 2 유형',
  '사회과학적 원리 연계 및 현실 쟁점 비판·정책 대안 도출형',
  '60분 권장 / 800±100자 (700~900자 엄수)',
  '경영·경제·법학 1번의 2배 가중 / 자율전공 55점 / 사범·예술 40~50점',
  '“제시문 (마)의 [사회과학/제도적 원리]를 바탕으로 (바)~(아)에 나타난 [현실 쟁점/부작용]을 분석하고, 이에 대한 국가/사회의 개선 방안이나 정책의 한계점을 논술하시오.”',
  '{"base": "제시문 (마) [원리/제도]: 정치철학, 경제, 법, 사회 제도 원리 (포용적 제도, 대의제와 기본권, 시장경제 신뢰와 사법권, 무역 원리, 공동체주의 등)", "targets": "제시문 (바)~(아) [현실 쟁점]: 현실 사회·경제·과학기술의 구체적 부작용 및 갈등 사례 (AI 디스토피아, 가짜뉴스, 유전자 가위, 무역 공급망, 상속세 등)"}'::jsonb,
  '정치철학, 법, 경제학적 원리를 바탕으로 현실 사회의 복합적 쟁점을 다각도로 진단하고, 실효성 있는 대안과 그 대안이 수반할 수 있는 딜레마·한계까지 성찰하는 심층 정책 논술 유형입니다.',
  '[{"step": "1단계: 서론·원리규명", "title": "제도적 핵심 원리 제시", "desc": "제시문 (마)의 본질적 사회·제도적 원리(국가의 역할, 기본권, 시장 신뢰 등)를 압축 정리", "charGuide": "약 150자"}, {"step": "2단계: 본론·현실진단", "title": "현실 쟁점의 다각도 분석", "desc": "(바)~(아)의 구체적 현실 사례에서 발생한 문제의 원인과 긍·부정적 파급 효과를 연계 분석", "charGuide": "각 150~200자 (총 400~450자)"}, {"step": "3단계: 결론·대안과 한계", "title": "정책 대안 및 딜레마 성찰", "desc": "단순 당위론을 넘어 실효적 개선책을 제시하고, 그 정책이 초래할 수 있는 한계/부작용까지 입체적 규명", "charGuide": "약 200~250자"}]'::jsonb,
  ARRAY['포용적 제도와 시민참여', '언론의 3대 기능과 대의제', '유전자 가위와 국가 역할', '국제무역과 공급망', '시장 신뢰와 사법권', '공동체 분배와 기업가 정신']
);

-- 5. 탭 1: 기출 / 모의 / 예상 문제 목록 (12개 문항)
DELETE FROM public.exams WHERE univ_id = 'hongik';
INSERT INTO public.exams (id, univ_id, year, title, type, target_faculty, total_time, total_length, level, summary)
VALUES
(
  'hongik-2027-humanities-expected-01', 'hongik', '2027학년도 대비 실전예상',
  '2027학년도 홍익대 수시 인문계열 논술고사 예상문제 1', '예상문제',
  '인문계열 (공통)', 120, '각 문항당 800±100자 (총 2문항 1,600자)', '실전 예상 (최신 기출 융합형)',
  '문항 1: [가상성과 실재의 긴장 및 주체성 형성 양상 비교·대조] / 문항 2: [알고리즘 플랫폼 경제의 자율성과 종속성 분석 및 제도적 해결 방안]'
),
(
  'hongik-2027-humanities-expected-02', 'hongik', '2027학년도 대비 실전예상',
  '2027학년도 홍익대 수시 인문계열 논술고사 예상문제 2', '예상문제',
  '인문계열 (공통)', 120, '각 문항당 800±100자 (총 2문항 1,600자)', '실전 예상 (교과 융합 심화형)',
  '문항 1: [공감의 확장과 도덕적 한계에 대한 다각도 분석] / 문항 2: [기후위기 대응과 정의로운 전환을 둘러싼 사회적 갈등 및 정책적 딜레마]'
),
(
  'hongik-2027-mock-humanities', 'hongik', '2027학년도',
  '2027학년도 홍익대학교 모의논술고사 인문계열 (최신 공식)', '모의논술',
  '인문계열 (공통)', 120, '각 문항당 800±100자 (총 2문항 1,600자)', '상(2027 공식 모의)',
  '문항 1: [인간과 기술의 상호작용 및 주체성 변화 양상 분석] / 문항 2: [디지털 플랫폼 독점과 공정경쟁의 사회적 원리 및 규제 대안]'
),
(
  'hongik-2026-humanities-real', 'hongik', '2026학년도',
  '2026학년도 수시 기출 인문계열 (오전 공식)', '기출문제',
  '인문계열 (공통)', 120, '각 800±100자 (총 1,600자)', '상',
  '문항 1: 집중과 분산의 다면적 양상 분석 및 관점 전환 / 문항 2: 언론의 3대 기능과 대의제 민주주의의 위기 및 대안'
),
(
  'hongik-2026-humanities-pm-real', 'hongik', '2026학년도',
  '2026학년도 수시 기출 인문계열 (오후 공식)', '기출문제',
  '인문계열 (공통)', 120, '각 800±100자 (총 1,600자)', '상(심화)',
  '문항 1: 역사 서술의 취사선택과 기록의 굴절 양상 / 문항 2: 포용적 제도와 착취적 제도의 메커니즘 및 지속가능성'
),
(
  'hongik-2026-mock-humanities', 'hongik', '2026학년도',
  '2026학년도 모의논술 인문계열 (수시)', '모의논술',
  '인문계열 (공통)', 120, '각 800±100자 (총 1,600자)', '중상',
  '문항 1: 고전적 범주관과 대안적 범주관의 대조 / 문항 2: 유전자 가위 기술의 윤리적 쟁점과 국가의 규제 원리'
),
(
  'hongik-2025-humanities-am-real', 'hongik', '2025학년도',
  '2025학년도 수시 기출 인문계열 (오전)', '기출문제',
  '인문계열 (공통)', 120, '각 800±100자 (총 1,600자)', '상',
  '문항 1: 문화 변동과 정체성 유지의 길항 관계 / 문항 2: 국제무역 분쟁과 글로벌 공급망 재편의 정책 대안'
),
(
  'hongik-2025-humanities-pm-real', 'hongik', '2025학년도',
  '2025학년도 수시 기출 인문계열 (오후)', '기출문제',
  '인문계열 (공통)', 120, '각 800±100자 (총 1,600자)', '상(심화)',
  '문항 1: 4대 윤리적 판단 기준의 비교와 도덕적 딜레마 / 문항 2: 상속세 완화와 조세 정의의 충돌 및 제도 개선책'
),
(
  'hongik-2025-mock-humanities', 'hongik', '2025학년도',
  '2025학년도 모의논술 인문계열', '모의논술',
  '인문계열 (공통)', 120, '각 800±100자 (총 1,600자)', '중',
  '문항 1: 인간 중심주의와 생태 중심주의 환경관 대조 / 문항 2: 기본소득제 도입의 경제적 효율성과 재정 건전성'
),
(
  'hongik-2024-humanities-am-real', 'hongik', '2024학년도',
  '2024학년도 수시 기출 인문계열 (오전)', '기출문제',
  '인문계열 (공통)', 120, '각 800±100자 (총 1,600자)', '중상',
  '문항 1: 예술의 사회적 효용성과 순수예술론 대립 / 문항 2: 시장경제에서의 정보 비대칭과 소비자 보호 입법'
),
(
  'hongik-2024-humanities-pm-real', 'hongik', '2024학년도',
  '2024학년도 수시 기출 인문계열 (오후)', '기출문제',
  '인문계열 (공통)', 120, '각 800±100자 (총 1,600자)', '상',
  '문항 1: 다수결 원리와 소수자 권리 보호의 한계 / 문항 2: 기업의 사회적 책임(CSR)과 주주 가치 극대화 충돌'
),
(
  'hongik-2024-mock-humanities', 'hongik', '2024학년도',
  '2024학년도 모의논술 인문계열', '모의논술',
  '인문계열 (공통)', 120, '각 800±100자 (총 1,600자)', '중',
  '문항 1: 언어의 사고 형성론과 반영론 대조 / 문항 2: 전자감시 사회와 개인의 프라이버시권 보장 원리'
);

-- ==============================================================================
-- 동국대학교 기본 데이터 INSERT (SEED DATA)
-- ==============================================================================

-- 1. 대학 기본 정보
INSERT INTO public.universities (id, name, faculty, exam_duration, total_questions, char_per_question, exam_format, is_active)
VALUES (
  'dongguk',
  '동국대학교',
  '인문계열 (공통)',
  '100분 (문제 1: 20분 / 문제 2: 35분 / 문제 3: 45분 권장)',
  '3개 문항 (총 1,500자 내외)',
  '문제 1 (250~400자) / 문제 2 (400~550자) / 문제 3 (550~700자)',
  '원고지 답안지 작성형 (문항별 지정 글자 수 범위 엄수, 문단 구분 명확화)',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  faculty = EXCLUDED.faculty,
  exam_duration = EXCLUDED.exam_duration,
  char_per_question = EXCLUDED.char_per_question,
  is_active = EXCLUDED.is_active;

-- 2. 시험 목록
INSERT INTO public.exams (id, univ_id, year, title, type, target_faculty, total_time, total_length, level, summary)
VALUES
(
  'dongguk-2027-mock', 'dongguk', '2027학년도',
  '2027학년도 동국대학교 수시 인문계열 모의논술고사 (공식 출제)', '모의논술',
  '인문계열 (공통)', 100, '총 3문항 (문제 1: 300자 / 문제 2: 500자 / 문제 3: 650자 내외)', '대학 공식 모의',
  '도구적 합리성의 맹점과 플랫폼 알고리즘 노동 분석, 시장 자율 대 공공 제도 개입의 비교·비판을 다룬 최신 공식 모의논술입니다.'
),
(
  'dongguk-2026-humanities-1', 'dongguk', '2026학년도',
  '2026학년도 동국대학교 수시 인문계열 기출문제 (인문 I)', '기출문제',
  '인문계열 (공통)', 100, '총 3문항 1,500자 내외 (문항당 300자~650자)', '실전 기출 (상)',
  '역사적 기억의 구성과 집단 정체성 형성, 문화적 전유와 포용적 다문화 정책의 실효성을 종합 평가한 정규 기출문제입니다.'
),
(
  'dongguk-2026-humanities-2', 'dongguk', '2026학년도',
  '2026학년도 동국대학교 수시 인문계열 기출문제 (인문 II)', '기출문제',
  '인문계열 (공통)', 100, '총 3문항 1,500자 내외 (문항당 300자~650자)', '실전 기출 (상)',
  '경제적 불평등과 기회의 공정성, 법치주의와 시민 불복종의 정당성 한계를 3단계로 심층 논증한 실전 기출문제입니다.'
),
(
  'dongguk-2025-humanities', 'dongguk', '2025학년도',
  '2025학년도 동국대학교 수시 인문계열 기출문제', '기출문제',
  '인문계열 (공통)', 100, '총 3문항 1,500자 내외 (문항당 300자~650자)', '실전 기출 (중상)',
  '과학기술 위험 사회에서의 민주적 의사결정 방식과 생태적 지속가능성을 주제로 한 동국대 대표 기출입니다.'
)
ON CONFLICT (id) DO NOTHING;

