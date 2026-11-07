/**
 * @file app/api/admin/grading-policy/route.ts
 * @description 관리자 전용 AI 채점 및 대학 패스 운영 정책 조회(GET) 및 저장(POST) API
 *              - 쿨다운 시간(분), 문항당 최대 응시횟수(회), 패스 기본 유효기간(일), 기본 채점 횟수(회), 정밀 채점 AI 모델
 *              - 별도의 신규 테이블 생성 SQL 실행 없이도 즉시 작동하도록 public.universities 테이블의
 *                시스템 예약 레코드(id = '__grading_policy__')에 정책 수치를 영구 보관합니다.
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const POLICY_RECORD_ID = '__grading_policy__'
export const DEFAULT_COOLDOWN_MINUTES = 3
export const DEFAULT_MAX_ATTEMPTS = 5
export const DEFAULT_PERIOD_DAYS = 365 // 기본 패스 유효기간 365일
export const DEFAULT_BASE_CREDITS = 60 // 기본 패스 제공 채점 횟수 60회
export const DEFAULT_GRADING_MODEL = 'gemini-3.1-pro-preview' // 기본 정밀 채점 AI 모델

/**
 * 1. 현재 설정된 AI 채점 및 패스 운영 정책 조회 (GET)
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('universities')
      .select('exam_duration, total_questions, char_per_question')
      .eq('id', POLICY_RECORD_ID)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({
        success: true,
        policy: {
          cooldownMinutes: DEFAULT_COOLDOWN_MINUTES,
          maxAttempts: DEFAULT_MAX_ATTEMPTS,
          periodDays: DEFAULT_PERIOD_DAYS,
          baseCredits: DEFAULT_BASE_CREDITS,
          gradingModel: DEFAULT_GRADING_MODEL,
        },
      })
    }

    const parsedCooldown = Number(data.exam_duration)
    const parsedMaxAttempts = Number(data.total_questions)

    // char_per_question 필드에 JSON 형식으로 확장 정책(periodDays, baseCredits, gradingModel)이 저장되어 있는지 파싱
    let periodDays = DEFAULT_PERIOD_DAYS
    let baseCredits = DEFAULT_BASE_CREDITS
    let gradingModel = DEFAULT_GRADING_MODEL

    if (data.char_per_question) {
      try {
        const extraConfig = JSON.parse(data.char_per_question)
        if (typeof extraConfig.periodDays === 'number' && extraConfig.periodDays >= 0) {
          periodDays = extraConfig.periodDays
        }
        if (typeof extraConfig.baseCredits === 'number' && extraConfig.baseCredits > 0) {
          baseCredits = extraConfig.baseCredits
        }
        if (typeof extraConfig.gradingModel === 'string' && extraConfig.gradingModel.trim()) {
          gradingModel = extraConfig.gradingModel.trim()
        }
      } catch {
        // 기존 문자열 형식인 경우 기본값 유지
      }
    }

    return NextResponse.json({
      success: true,
      policy: {
        cooldownMinutes:
          !Number.isNaN(parsedCooldown) && parsedCooldown >= 0
            ? parsedCooldown
            : DEFAULT_COOLDOWN_MINUTES,
        maxAttempts:
          !Number.isNaN(parsedMaxAttempts) && parsedMaxAttempts >= 0
            ? parsedMaxAttempts
            : DEFAULT_MAX_ATTEMPTS,
        periodDays,
        baseCredits,
        gradingModel,
      },
    })
  } catch (err: any) {
    console.warn('[GET /api/admin/grading-policy] 오류:', err)
    return NextResponse.json({
      success: true,
      policy: {
        cooldownMinutes: DEFAULT_COOLDOWN_MINUTES,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        periodDays: DEFAULT_PERIOD_DAYS,
        baseCredits: DEFAULT_BASE_CREDITS,
        gradingModel: DEFAULT_GRADING_MODEL,
      },
    })
  }
}

/**
 * 2. AI 채점 및 패스 운영 정책 업데이트 (POST)
 *    - cooldownMinutes: 재제출 대기 시간(분 단위, 0 = 쿨다운 없음)
 *    - maxAttempts: 문항당 최대 채점 횟수(회 단위, 0 = 무제한)
 *    - periodDays: 패스 유효기간 (일 단위, 기본 365일, 0 = 무제한)
 *    - baseCredits: 패스 기본 제공 채점 횟수 (회 단위, 기본 60회)
 *    - gradingModel: 정밀 채점 AI 모델 식별자 (기본 gemini-3.1-pro-preview)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const rawCooldown = Number(body.cooldownMinutes)
    const rawMaxAttempts = Number(body.maxAttempts)
    const rawPeriodDays = Number(body.periodDays ?? DEFAULT_PERIOD_DAYS)
    const rawBaseCredits = Number(body.baseCredits ?? DEFAULT_BASE_CREDITS)
    const rawGradingModel = typeof body.gradingModel === 'string' && body.gradingModel.trim()
      ? body.gradingModel.trim()
      : DEFAULT_GRADING_MODEL

    if (Number.isNaN(rawCooldown) || rawCooldown < 0 || rawCooldown > 1440) {
      return NextResponse.json(
        { success: false, error: '쿨다운 시간은 0분(제한 없음) ~ 1,440분(24시간) 사이의 숫자로 입력해 주세요.' },
        { status: 400 }
      )
    }

    if (Number.isNaN(rawMaxAttempts) || rawMaxAttempts < 0 || rawMaxAttempts > 999) {
      return NextResponse.json(
        { success: false, error: '문항당 최대 응시횟수는 0회(무제한) ~ 999회 사이의 숫자로 입력해 주세요.' },
        { status: 400 }
      )
    }

    if (Number.isNaN(rawPeriodDays) || rawPeriodDays < 0 || rawPeriodDays > 3650) {
      return NextResponse.json(
        { success: false, error: '패스 유효기간은 0일(무제한) ~ 3,650일(10년) 사이의 숫자로 입력해 주세요.' },
        { status: 400 }
      )
    }

    if (Number.isNaN(rawBaseCredits) || rawBaseCredits <= 0 || rawBaseCredits > 9999) {
      return NextResponse.json(
        { success: false, error: '패스 기본 채점 횟수는 1회 ~ 9,999회 사이의 숫자로 입력해 주세요.' },
        { status: 400 }
      )
    }

    const cooldownMinutes = Math.floor(rawCooldown)
    const maxAttempts = Math.floor(rawMaxAttempts)
    const periodDays = Math.floor(rawPeriodDays)
    const baseCredits = Math.floor(rawBaseCredits)
    const gradingModel = rawGradingModel

    // 확장 정책 데이터 JSON 인코딩
    const extraPolicyJson = JSON.stringify({
      cooldownMinutes,
      maxAttempts,
      periodDays,
      baseCredits,
      gradingModel,
      updatedAt: new Date().toISOString(),
    })

    const { error } = await supabase.from('universities').upsert(
      {
        id: POLICY_RECORD_ID,
        name: '[시스템 예약] AI 채점 및 패스 운영 정책',
        faculty: 'SYSTEM_CONFIG',
        exam_duration: String(cooldownMinutes),
        total_questions: String(maxAttempts),
        char_per_question: extraPolicyJson,
        exam_format: 'SYSTEM_POLICY',
        is_active: false,
      },
      { onConflict: 'id' }
    )

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      policy: {
        cooldownMinutes,
        maxAttempts,
        periodDays,
        baseCredits,
        gradingModel,
      },
    })
  } catch (err: any) {
    console.error('[POST /api/admin/grading-policy] 저장 오류:', err)
    return NextResponse.json(
      { success: false, error: err.message || '채점 정책 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
