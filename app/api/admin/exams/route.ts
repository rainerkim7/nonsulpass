/**
 * @file app/api/admin/exams/route.ts
 * @description 관리자용 기출문제 CRUD API 라우트
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 1. 기출문제 목록 조회 (GET)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const univId = searchParams.get('univ_id') || 'hongik'

    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('univ_id', univId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, exams: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}

// 2. 기출문제 추가 또는 수정 (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      id,
      univ_id = 'hongik',
      year,
      title,
      type = '기출문제',
      target_faculty = '인문·사회계열 공통',
      total_time = 120,
      total_length = '총 1,600자 (800자×2문항)',
      level = '실전 난이도',
      summary = ''
    } = body

    if (!title || !year) {
      return NextResponse.json(
        { error: '연도(year)와 시험명(title)은 필수 입력 항목입니다.' },
        { status: 400 }
      )
    }

    // ID가 없으면 고유 ID 생성 (예: hongik-2026-custom-1234)
    const examId = id || `${univ_id}-${year.replace(/[^0-9]/g, '')}-${Date.now().toString().slice(-4)}`

    const examPayload: any = {
      id: examId,
      univ_id,
      year,
      title,
      type,
      target_faculty,
      total_time: Number(total_time) || 120,
      total_length,
      level,
      summary
    }

    if (body.questions) {
      examPayload.questions = body.questions
    }

    let { data, error } = await supabase
      .from('exams')
      .upsert(examPayload)
      .select()
      .single()

    if (error && error.message?.includes('questions')) {
      delete examPayload.questions
      const retry = await supabase.from('exams').upsert(examPayload).select().single()
      data = retry.data
      error = retry.error
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, exam: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}

// 3. 기출문제 삭제 (DELETE)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    let examId = searchParams.get('id')

    if (!examId) {
      const body = await req.json().catch(() => ({}))
      examId = body.id
    }

    if (!examId) {
      return NextResponse.json({ error: '삭제할 시험 ID(id)가 누락되었습니다.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedId: examId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}
