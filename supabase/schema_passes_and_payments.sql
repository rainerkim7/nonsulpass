-- ==============================================================================
-- Nonsul Pass Lab: 대학별 이용권(user_passes), 채점 시도 로그(exam_attempt_logs), 결제 주문(payment_orders) 스키마
-- ==============================================================================

-- 1. 대학별 이용권 및 크레딧 테이블 (user_passes)
CREATE TABLE IF NOT EXISTS public.user_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  university TEXT NOT NULL,                     -- 예: '홍익대학교', '경희대학교'
  total_credits INT NOT NULL DEFAULT 30,         -- 총 부여 크레딧 (기본 30회)
  remaining_credits INT NOT NULL DEFAULT 30,     -- 잔여 크레딧
  pass_type TEXT NOT NULL DEFAULT 'standard_30', -- 'standard_30', 'addon_5', 'addon_10'
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,               -- 결제일로부터 30일
  is_active BOOLEAN NOT NULL DEFAULT true,       -- 유효 여부
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_passes_user_univ ON public.user_passes(user_id, university, is_active);
CREATE INDEX IF NOT EXISTS idx_user_passes_expires_at ON public.user_passes(expires_at);

-- 2. 어뷰징 방지 문항별 시도 기록 테이블 (exam_attempt_logs)
-- 특정 1문항에 여러 학생 답안을 몰아서 채점하는 행위(최대 5회 상한) 및 연속 제출(15분 쿨다운) 방어
CREATE TABLE IF NOT EXISTS public.exam_attempt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  university TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  question_id TEXT NOT NULL,                     -- 'q1', 'q2', 'q3' 등
  attempt_count INT NOT NULL DEFAULT 1,          -- 해당 문항 채점 누적 횟수 (최대 5회)
  last_submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 유저별 문항 유니크 인덱스 (ON CONFLICT 구문용)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_exam_q_unique ON public.exam_attempt_logs(user_id, exam_id, question_id);

-- 3. 결제 주문 내역 테이블 (payment_orders)
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,                -- 주문 고유번호 (예: ORD-20261015-XXXXX)
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,                   -- 'PASS_30', 'ADDON_5', 'ADDON_10'
  university TEXT NOT NULL,
  amount INT NOT NULL,                          -- 19800, 4900, 8900
  status TEXT NOT NULL DEFAULT 'READY',         -- 'READY', 'PAID', 'FAILED', 'CANCELLED'
  pg_provider TEXT NOT NULL DEFAULT 'tosspayments', -- 'tosspayments', 'portone'
  pg_tid TEXT,                                  -- PG 거래 식별자
  payment_key TEXT,                             -- 토스 paymentKey 등
  receipt_url TEXT,                             -- 영수증 링크
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON public.payment_orders(order_id);

-- ==============================================================================
-- 4. 원자적(Atomic) 채점 크레딧 차감 및 어뷰징 검증 RPC 함수
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.use_grading_credit(
  p_user_id UUID,
  p_university TEXT,
  p_exam_id TEXT,
  p_question_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_pass_id UUID;
  v_remaining_credits INT;
  v_attempt_count INT := 0;
  v_last_submitted TIMESTAMPTZ;
  v_elapsed_seconds INT;
  v_cooldown_limit INT := 900; -- 15분 (900초) 쿨다운
  v_max_attempts INT := 5;     -- 문항당 최대 5회 상한
BEGIN
  -- 1) 문항별 시도 기록 조회 및 어뷰징(쿨다운 / 최대횟수) 검증
  SELECT attempt_count, last_submitted_at
    INTO v_attempt_count, v_last_submitted
    FROM public.exam_attempt_logs
   WHERE user_id = p_user_id
     AND exam_id = p_exam_id
     AND question_id = p_question_id;

  -- 1-1) 문항당 최대 횟수 초과 여부 확인
  IF v_attempt_count >= v_max_attempts THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'MAX_ATTEMPTS_EXCEEDED',
      'message', '해당 문항의 최대 채점 한도(5회)를 초과하였습니다. 다른 문항에 도전해 보세요.',
      'attempt_count', v_attempt_count
    );
  END IF;

  -- 1-2) 15분 쿨다운 검증 (기존 제출 기록이 있는 경우에만)
  IF v_last_submitted IS NOT NULL THEN
    v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_last_submitted))::INT;
    IF v_elapsed_seconds < v_cooldown_limit THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'COOLDOWN_ACTIVE',
        'message', '이전 첨삭 리포트를 복습할 수 있도록 제출 쿨다운 중입니다.',
        'cooldown_remaining_seconds', (v_cooldown_limit - v_elapsed_seconds),
        'attempt_count', v_attempt_count
      );
    END IF;
  END IF;

  -- 2) 유효한 패스 조회 및 행 잠금(FOR UPDATE)으로 동시성 보장
  SELECT id, remaining_credits
    INTO v_pass_id, v_remaining_credits
    FROM public.user_passes
   WHERE user_id = p_user_id
     AND university = p_university
     AND is_active = true
     AND expires_at > now()
     AND remaining_credits > 0
   ORDER BY expires_at ASC
   LIMIT 1
   FOR UPDATE;

  -- 2-1) 유효한 패스 또는 잔여 크레딧이 없는 경우
  IF v_pass_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'NO_CREDITS',
      'message', '해당 대학의 유효한 이용권이 없거나 잔여 채점 크레딧이 모두 소진되었습니다.',
      'remaining_credits', 0
    );
  END IF;

  -- 3) 크레딧 1회 차감 처리
  UPDATE public.user_passes
     SET remaining_credits = remaining_credits - 1,
         updated_at = now()
   WHERE id = v_pass_id;

  v_remaining_credits := v_remaining_credits - 1;

  -- 4) 문항별 시도 기록 갱신 (없으면 INSERT, 있으면 attempt_count 증가)
  INSERT INTO public.exam_attempt_logs (
    user_id, university, exam_id, question_id, attempt_count, last_submitted_at
  )
  VALUES (
    p_user_id, p_university, p_exam_id, p_question_id, 1, now()
  )
  ON CONFLICT (user_id, exam_id, question_id) DO UPDATE
  SET
    attempt_count = public.exam_attempt_logs.attempt_count + 1,
    last_submitted_at = now();

  -- 최종 성공 응답 반환
  RETURN jsonb_build_object(
    'success', true,
    'code', 'OK',
    'message', '채점 크레딧이 1회 사용되었습니다.',
    'remaining_credits', v_remaining_credits,
    'attempt_count', v_attempt_count + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 5. Row Level Security (RLS) 정책 설정
-- ==============================================================================
ALTER TABLE public.user_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempt_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- 5-1. user_passes 정책 (본인 조회 가능, 서비스 롤 및 관리자 전체)
CREATE POLICY "Users can view own passes"
  ON public.user_passes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own passes"
  ON public.user_passes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own passes"
  ON public.user_passes FOR UPDATE
  USING (auth.uid() = user_id);

-- 5-2. exam_attempt_logs 정책
CREATE POLICY "Users can view own attempt logs"
  ON public.exam_attempt_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempt logs"
  ON public.exam_attempt_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempt logs"
  ON public.exam_attempt_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- 5-3. payment_orders 정책
CREATE POLICY "Users can view own payment orders"
  ON public.payment_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment orders"
  ON public.payment_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);
