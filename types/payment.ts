/**
 * @file types/payment.ts
 * @description 대학별 패스, 채점 크레딧, 결제 주문 및 어뷰징 검증 관련 TypeScript 타입 정의
 */

// 이용권 유형: 기본 30회 패스, 추가 충전권 5회, 추가 충전권 10회
export type PassType = 'standard_30' | 'addon_5' | 'addon_10'

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
 * 지원하는 기본 유료 상품 목록 상수
 */
export const PASS_PRODUCTS: PassProductItem[] = [
  {
    id: 'standard_30',
    name: '30일 대학 마스터 패스',
    price: 19800,
    badge: '인기 / 추천',
    credits: 30,
    periodDays: 30,
    description: '해당 대학 15개 전 시험 세트 + 30회 자율 채점 크레딧',
    features: [
      '해당 대학 15개 시험 (기출+모의+예상) 전체 해금',
      'AI 정밀 첨삭 및 다차원 루브릭 리포트 30회',
      '초안 및 퇴고 답안 자율 분배 훈련',
      '내 첨삭 보관함 무제한 열람 및 복습'
    ]
  },
  {
    id: 'addon_5',
    name: '추가 채점권 5회',
    price: 4900,
    credits: 5,
    periodDays: 30,
    description: '취약한 고난도 문항 집중 퇴고를 위한 알짜 충전',
    features: [
      '채점 크레딧 +5회 즉시 추가 충전',
      '기존 마스터 패스 유효기간 내 사용 가능'
    ]
  },
  {
    id: 'addon_10',
    name: '추가 채점권 10회',
    price: 8900,
    badge: '할인 혜택',
    credits: 10,
    periodDays: 30,
    description: '수시 파이널 직전 완벽한 최종 실전 대비',
    features: [
      '채점 크레딧 +10회 즉시 추가 충전 (약 9% 할인)',
      '도표/다면 분석 문항 무제한 심화 퇴고'
    ]
  }
]
