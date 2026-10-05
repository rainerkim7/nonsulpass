/**
 * @file app/api/admin/trends/route.ts
 * @description 관리자용 출제 경향 및 유형 분석(university_trends) CRUD API 라우트
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 1. 출제 경향 목록 조회 (GET)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const univId = searchParams.get('univ_id') || 'hongik'

    const { data, error } = await supabase
      .from('university_trends')
      .select('*')
      .eq('univ_id', univId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, trends: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}

// 2. 출제 경향 단건 추가 또는 수정 (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      id,
      univ_id = 'hongik',
      question_number,
      question_type,
      exam_time = '',
      score_weight = '',
      question_template = '',
      passage_structure = { base: '', targets: '' },
      description = '',
      writing_formula = [],
      frequent_themes = []
    } = body

    if (!question_number || !question_type) {
      return NextResponse.json(
        { error: '문항 번호(question_number)와 문제 유형명(question_type)은 필수 입력 항목입니다.' },
        { status: 400 }
      )
    }

    // payload 구성 (id가 있으면 업데이트, 없으면 자동 생성)
    const rowPayload: any = {
      univ_id,
      question_number,
      question_type,
      exam_time,
      score_weight,
      question_template,
      passage_structure,
      description,
      writing_formula,
      frequent_themes
    }

    if (id) {
      rowPayload.id = id
    }

    const { data, error } = await supabase
      .from('university_trends')
      .upsert(rowPayload)
      .select()
      .single()

    if (error) {
      console.error('[Admin Trends Save Error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, trend: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}

// 3. 출제 경향 단건 삭제 (DELETE)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    let id = searchParams.get('id')

    if (!id) {
      const body = await req.json().catch(() => ({}))
      id = body.id
    }

    if (!id) {
      return NextResponse.json({ error: '삭제할 출제 경향 ID(id)가 누락되었습니다.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('university_trends')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Admin Trends Delete Error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}
