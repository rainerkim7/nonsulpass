/**
 * @file app/api/admin/universities/route.ts
 * @description 관리자 콘솔 및 프론트엔드용 전체 대학 목록 조회(GET) 및 신규 대학 추가/수정(POST) API
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { mergeUniversitiesWithDb } from '@/lib/constants/universities'

export const dynamic = 'force-dynamic'

/**
 * 1. 전체 대학 목록 조회 (기본 프리셋 + DB 등록 대학 + 기출 보유 대학 병합)
 */
export async function GET() {
  try {
    const [univRes, examsRes] = await Promise.all([
      supabase.from('universities').select('*').order('created_at', { ascending: true }),
      supabase.from('exams').select('univ_id'),
    ])

    const dbUnivs = univRes.data || []
    const examUnivIds = Array.from(new Set((examsRes.data || []).map((e: any) => e.univ_id).filter(Boolean)))

    const merged = mergeUniversitiesWithDb(dbUnivs, examUnivIds)

    return NextResponse.json({
      success: true,
      universities: merged,
      dbUniversities: dbUnivs,
      activeExamUnivIds: examUnivIds,
    })
  } catch (err: any) {
    console.error('[GET /api/admin/universities] 오류:', err)
    return NextResponse.json(
      { success: false, error: err.message || '대학 목록 조회 실패' },
      { status: 500 }
    )
  }
}

/**
 * 2. 신규 대학 등록 또는 기존 대학 기본 정보 업데이트 (POST)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      id,
      name,
      faculty = '인문계열 (공통)',
      exam_duration = '120분',
      total_questions = '2문항',
      char_per_question = '문항당 800~1,000자',
      exam_format = '원고지 완결형 서술',
      is_active = true,
    } = body

    if (!id || !name) {
      return NextResponse.json(
        { error: '대학 영문 식별자(id)와 대학명(name)은 필수 입력 항목입니다.' },
        { status: 400 }
      )
    }

    const cleanId = String(id)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')

    if (!cleanId) {
      return NextResponse.json(
        { error: '대학 ID는 영문 소문자와 숫자만 사용할 수 있습니다. (예: ajou, inha, pnu)' },
        { status: 400 }
      )
    }

    const cleanName = String(name).trim()

    const { data, error } = await supabase
      .from('universities')
      .upsert({
        id: cleanId,
        name: cleanName,
        faculty: String(faculty).trim() || '인문계열 (공통)',
        exam_duration: String(exam_duration).trim() || '120분',
        total_questions: String(total_questions).trim() || '2문항',
        char_per_question: String(char_per_question).trim() || '문항당 800~1,000자',
        exam_format: String(exam_format).trim() || '원고지 완결형 서술',
        is_active: Boolean(is_active),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      university: data,
      message: `${cleanName}(${cleanId}) 대학이 성공적으로 등록 및 활성화되었습니다.`,
    })
  } catch (err: any) {
    console.error('[POST /api/admin/universities] 오류:', err)
    return NextResponse.json(
      { error: err.message || '신규 대학 등록 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

