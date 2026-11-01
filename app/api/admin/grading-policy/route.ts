/**
 * @file app/api/admin/grading-policy/route.ts
 * @description 관리자 전용 AI 채점 운영 정책(재제출 쿨다운 시간 · 문항당 최대 응시횟수 상한) 조회(GET) 및 저장(POST) API
 *              - 별도의 신규 테이블 생성 SQL 실행 없이도 즉시 작동하도록 public.universities 테이블의
 *                시스템 예약 레코드(id = '__grading_policy__')에 정책 수치를 영구 보관합니다.
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const POLICY_RECORD_ID = '__grading_policy__'
export const DEFAULT_COOLDOWN_MINUTES = 3
export const DEFAULT_MAX_ATTEMPTS = 5

/**
 * 1. 현재 설정된 AI 채점 운영 정책 조회 (GET)
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('universities')
      .select('exam_duration, total_questions')
      .eq('id', POLICY_RECORD_ID)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({
        success: true,
        policy: {
          cooldownMinutes: DEFAULT_COOLDOWN_MINUTES,
          maxAttempts: DEFAULT_MAX_ATTEMPTS,
        },
      })
    }

    const parsedCooldown = Number(data.exam_duration)
    const parsedMaxAttempts = Number(data.total_questions)

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
      },
    })
  } catch (err: any) {
    console.warn('[GET /api/admin/grading-policy] 오류:', err)
    return NextResponse.json({
      success: true,
      policy: {
        cooldownMinutes: DEFAULT_COOLDOWN_MINUTES,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
      },
    })
  }
}

/**
 * 2. AI 채점 운영 정책 업데이트 (POST)
 *    - cooldownMinutes: 재제출 대기 시간(분 단위, 0 = 쿨다운 없음)
 *    - maxAttempts: 문항당 최대 채점 횟수(회 단위, 0 = 무제한)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const rawCooldown = Number(body.cooldownMinutes)
    const rawMaxAttempts = Number(body.maxAttempts)

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

    const cooldownMinutes = Math.floor(rawCooldown)
    const maxAttempts = Math.floor(rawMaxAttempts)

    const { error } = await supabase.from('universities').upsert(
      {
        id: POLICY_RECORD_ID,
        name: '[시스템 예약] AI 채점 운영 정책',
        faculty: 'SYSTEM_CONFIG',
        exam_duration: String(cooldownMinutes),
        total_questions: String(maxAttempts),
        char_per_question: `쿨다운 ${cooldownMinutes}분 / 최대 ${maxAttempts === 0 ? '무제한' : `${maxAttempts}회`}`,
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

