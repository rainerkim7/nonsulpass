/**
 * @file app/api/admin/rubrics/route.ts
 * @description 관리자용 배점 체계(scoring_rules) 및 공식 루브릭(university_rubrics) CRUD API 라우트
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// 1. 배점 체계 및 루브릭 목록 조회 (GET)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const univId = searchParams.get('univ_id') || 'hongik'

    const [scoringRes, rubricsRes] = await Promise.all([
      supabase
        .from('scoring_rules')
        .select('*')
        .eq('univ_id', univId)
        .order('display_order', { ascending: true }),
      supabase
        .from('university_rubrics')
        .select('*')
        .eq('univ_id', univId)
        .order('display_order', { ascending: true }),
    ])

    if (scoringRes.error) {
      return NextResponse.json({ error: scoringRes.error.message }, { status: 500 })
    }
    if (rubricsRes.error) {
      return NextResponse.json({ error: rubricsRes.error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      scoringRules: scoringRes.data || [],
      rubrics: rubricsRes.data || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}

// 2. 단건 추가 또는 수정 (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { targetType, item, univ_id = 'hongik' } = body

    if (!targetType || !item) {
      return NextResponse.json(
        { error: 'targetType (scoring | rubric)과 item 데이터가 필요합니다.' },
        { status: 400 }
      )
    }

    if (targetType === 'scoring') {
      const { id, faculty, chip = '', score, sub_desc = '', display_order = 0 } = item
      if (!faculty || !score) {
        return NextResponse.json(
          { error: '모집 계열(faculty)과 배점 체계(score)는 필수 입력 항목입니다.' },
          { status: 400 }
        )
      }

      const payload: any = {
        univ_id,
        faculty,
        chip,
        score,
        sub_desc,
        display_order: Number(display_order) || 0,
      }
      if (id) payload.id = id

      const { data, error } = await supabase
        .from('scoring_rules')
        .upsert(payload)
        .select()
        .single()

      if (error) {
        console.error('[Admin Scoring Rule Save Error]:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, item: data })
    } else if (targetType === 'rubric') {
      const { id, ratio, category, description = '', details = [], display_order = 0 } = item
      if (!ratio || !category) {
        return NextResponse.json(
          { error: '반영 비율(ratio)과 평가 영역명(category)은 필수 입력 항목입니다.' },
          { status: 400 }
        )
      }

      const payload: any = {
        univ_id,
        ratio,
        category,
        description,
        details: Array.isArray(details) ? details : [],
        display_order: Number(display_order) || 0,
      }
      if (id) payload.id = id

      const { data, error } = await supabase
        .from('university_rubrics')
        .upsert(payload)
        .select()
        .single()

      if (error) {
        console.error('[Admin Rubric Save Error]:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, item: data })
    } else {
      return NextResponse.json({ error: '유효하지 않은 targetType입니다.' }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}

// 3. 단건 삭제 (DELETE)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    let id = searchParams.get('id')
    let targetType = searchParams.get('type') // 'scoring' | 'rubric'

    if (!id || !targetType) {
      const body = await req.json().catch(() => ({}))
      if (!id) id = body.id
      if (!targetType) targetType = body.type || body.targetType
    }

    if (!id || !targetType) {
      return NextResponse.json(
        { error: '삭제할 항목 ID(id)와 대상 유형(type: scoring | rubric)이 필요합니다.' },
        { status: 400 }
      )
    }

    const tableName = targetType === 'scoring' ? 'scoring_rules' : 'university_rubrics'

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`[Admin ${tableName} Delete Error]:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}
