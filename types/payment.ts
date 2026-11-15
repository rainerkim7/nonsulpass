/**
 * @file types/payment.ts
 * @description 대학별 패스, 채점 크레딧, 결제 주문 및 어뷰징 검증 관련 TypeScript 타입 정의
 */

// 이용권 유형: 패스 크래딧 4종(10/30/60/90회) 및 기존 대학별 패스 호환 타입
export type PassType =
  | 'credit_10'
  | 'credit_30'
  | 'credit_60'
  | 'credit_90'
  | 'standard_30'
  | 'addon_5'
  | 'addon_10'

// 주문 결제 상태
export type OrderStatus = 'READY' | 'PAID' | 'FAILED' | 'CANCELLED'

// PG 결제 제공사
export type PgProvider = 'tosspayments' | 'portone'

/**
 * 대학별 이용권(패스) 데이터 인터페이스
 */
export interface UserPass {
  id: string
  user_id: string
  university: string
  total_credits: number
  remaining_credits: number
  pass_type: PassType
  starts_at: string
  expires_at: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * 문항별 채점 시도 로그 인터페이스 (어뷰징 방지: 5회 상한 & 15분 쿨다운 추적)
 */
export interface ExamAttemptLog {
  id: string
  user_id: string
  university: string
  exam_id: string
  question_id: string
  attempt_count: number
  last_submitted_at: string
  created_at: string
}

/**
 * 결제 주문 내역 인터페이스
 */
export interface PaymentOrder {
  id: string
  order_id: string
  user_id: string
  product_type: PassType
  university: string
  amount: number
  status: OrderStatus
  pg_provider: PgProvider
  pg_tid?: string
  payment_key?: string
  receipt_url?: string
  paid_at?: string
  created_at: string
  updated_at: string
}

/**
 * 채점 크레딧 차감 RPC 함수 반환 결과
 */
export interface CreditDeductionResult {
  success: boolean
  code: 'OK' | 'NO_CREDITS' | 'COOLDOWN_ACTIVE' | 'MAX_ATTEMPTS_EXCEEDED' | 'ERROR'
  message: string
  remaining_credits?: number
  attempt_count?: number
  cooldown_remaining_seconds?: number
}

/**
 * 결제 모달에서 표시할 상품 품목 정의
 */
export interface PassProductItem {
  id: PassType
  name: string
  price: number
  badge?: string
  credits: number
  periodDays: number
  description: string
  features: string[]
}

/**
 * 지원하는 전 대학 패스 크래딧 패키지 목록 상수
 * (10회 3,300원 / 30회 9,900원 / 60회 19,800원 / 90회 29,700원)
 */
export const PASS_PRODUCTS: PassProductItem[] = [
  {
    id: 'credit_10',
    name: '패스 크래딧 10회',
    price: 3300,
    credits: 10,
    periodDays: 365,
    description: '부담 없이 시작하는 18개 전 대학 자유 이용권 10회',
    features: [
      '대학 제한 없이 18개 전 대학 자유 응시',
      'AI 정밀 첨삭 및 루브릭 리포트 10회',
      'PDF 리포트 저장 및 첨삭 보관함 복습',
    ],
  },
  {
    id: 'credit_30',
    name: '패스 크래딧 30회',
    price: 9900,
    badge: '인기',
    credits: 30,
    periodDays: 365,
    description: '목표 대학 여러 곳의 기출·모의논술을 균형 있게 훈련',
    features: [
      '대학 제한 없이 18개 전 대학 자유 응시',
      'AI 정밀 첨삭 및 루브릭 리포트 30회',
      '초안 및 퇴고 답안 자율 분배 훈련',
    ],
  },
  {
    id: 'credit_60',
    name: '패스 크래딧 60회',
    price: 19800,
    badge: '가장 추천',
    credits: 60,
    periodDays: 365,
    description: '수시 논술 6개 목표 대학 실전 완성을 위한 표준 패키지',
    features: [
      '대학 제한 없이 18개 전 대학 자유 응시',
      'AI 정밀 첨삭 및 루브릭 리포트 60회',
      '목표 대학 6곳 집중 파이널 대비',
    ],
  },
  {
    id: 'credit_90',
    name: '패스 크래딧 90회',
    price: 29700,
    badge: '대용량 집중',
    credits: 90,
    periodDays: 365,
    description: '전 문항 다회차 퇴고까지 넉넉하게 대비하는 집중 패키지',
    features: [
      '대학 제한 없이 18개 전 대학 자유 응시',
      'AI 정밀 첨삭 및 루브릭 리포트 90회',
      '고난도 문항 반복 첨삭 및 파이널 총정리',
    ],
  },
]
