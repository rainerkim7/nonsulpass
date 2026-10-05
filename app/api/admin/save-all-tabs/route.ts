/**
 * @file app/api/admin/save-all-tabs/route.ts
 * @description 올인원 파싱된 3대 탭(기출문제, 출제경향, 채점기준) 데이터를 Supabase DB에 일괄 저장하는 API
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      univId = 'khu',
      univName = '경희대학교',
      targetFaculty,
      tab1_exam,
      tab2_trends = [],
      tab3_scoring = {},
      selectedTabs = { tab1: true, tab2: true, tab3: true }
    } = body

    const shouldSaveTab1 = selectedTabs?.tab1 !== false
    const shouldSaveTab2 = selectedTabs?.tab2 !== false
    const shouldSaveTab3 = selectedTabs?.tab3 !== false

    if (shouldSaveTab1 && (!tab1_exam || !tab1_exam.title)) {
      return NextResponse.json(
        { error: '탭 1 기출문제를 저장하도록 선택되었으나, 기출문제 데이터가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const currentFaculty = targetFaculty || tab1_exam?.targetFaculty || '인문·사회계열'

    // 0. 대학 레코드가 없으면 universities 테이블에 생성 또는 업데이트
    const { data: existingUniv } = await supabase
      .from('universities')
      .select('id')
      .eq('id', univId)
      .single()

    if (!existingUniv) {
      await supabase.from('universities').insert({
        id: univId,
        name: univName,
        faculty: currentFaculty,
        exam_duration: `${tab1_exam?.totalTime || 120}분`,
        total_questions: `${tab1_exam?.questions?.length || 2}개 문항`,
        char_per_question: tab1_exam?.totalLength || '문항당 800~1,000자',
        exam_format: '원고지 완결형 서술',
        is_active: true
      })
    }

    let savedExamId: string | undefined = undefined

    // 1. 탭 1 기출문제 exams 테이블에 저장 (선택된 경우에만 upsert)
    if (shouldSaveTab1 && tab1_exam) {
      const cleanYear = (tab1_exam.year || '2027').replace(/[^0-9]/g, '')
      const examId = `${univId}-${cleanYear}-${Date.now().toString().slice(-4)}`
      savedExamId = examId

      const examPayload: any = {
        id: examId,
        univ_id: univId,
        year: tab1_exam.year || `${cleanYear}학년도`,
        title: tab1_exam.title,
        type: tab1_exam.type || '모의논술',
        target_faculty: currentFaculty,
        total_time: Number(tab1_exam.totalTime) || 120,
        total_length: tab1_exam.totalLength || '총 2,000자',
        level: '대학 공식 출제',
        summary: tab1_exam.summary || ''
      }

      if (tab1_exam.questions && Array.isArray(tab1_exam.questions) && tab1_exam.questions.length > 0) {
        examPayload.questions = tab1_exam.questions
      }

      let { error: examErr } = await supabase
        .from('exams')
        .upsert(examPayload)

      // questions 컬럼이 아직 DB에 생성되지 않은 경우를 대비한 안전한 Fallback
      if (examErr && examErr.message?.includes('questions')) {
        console.warn('[Save All Tabs] questions 컬럼 미존재 감지, 기본 메타데이터만 1차 저장합니다.')
        delete examPayload.questions
        const retry = await supabase.from('exams').upsert(examPayload)
        examErr = retry.error
      }

      if (examErr) {
        console.error('[Save All Tabs] Exams upsert error:', examErr)
        return NextResponse.json({ error: `기출문제 저장 실패: ${examErr.message}` }, { status: 500 })
      }
    }

    // 2. 탭 2 출제경향 university_trends 계열별 누적/선택 갱신 저장 (선택된 경우에만)
    if (shouldSaveTab2 && Array.isArray(tab2_trends) && tab2_trends.length > 0) {
      // 기존에 해당 계열로 저장된 트렌드만 삭제하여 타 계열 보존
      const { data: existingTrends } = await supabase
        .from('university_trends')
        .select('id, question_number, passage_structure')
        .eq('univ_id', univId)

      const idsToDelete = (existingTrends || [])
        .filter((tr: any) => {
          const f = tr.passage_structure?.faculty || ''
          const q = tr.question_number || ''
          return f === currentFaculty || q.includes(`[${currentFaculty}]`)
        })
        .map((tr: any) => tr.id)

      if (idsToDelete.length > 0) {
        await supabase.from('university_trends').delete().in('id', idsToDelete)
      }

      const trendRows = tab2_trends.map((t: any) => ({
        univ_id: univId,
        question_number: t.questionNumber?.includes(`[${currentFaculty}]`) ? t.questionNumber : `[${currentFaculty}] ${t.questionNumber || '문제 유형'}`,
        question_type: t.questionType || '',
        exam_time: t.examTime || '',
        score_weight: t.scoreWeight || '',
        question_template: t.questionTemplate || '',
        passage_structure: {
          ...(t.passageStructure || {}),
          faculty: currentFaculty
        },
        description: t.description || '',
        writing_formula: t.writingFormula || [],
        frequent_themes: t.frequentThemes || []
      }))

      const { error: trendErr } = await supabase.from('university_trends').insert(trendRows)
      if (trendErr) {
        console.error('[Save All Tabs] Trends error:', trendErr)
      }
    }

    // 3. 탭 3 채점기준 (scoringRules & rubrics) 계열별 저장 (선택된 경우에만)
    if (shouldSaveTab3) {
      const scoringRules = tab3_scoring.scoringRules || []
      if (Array.isArray(scoringRules) && scoringRules.length > 0) {
        const { data: existingRules } = await supabase
          .from('scoring_rules')
          .select('id, faculty')
          .eq('univ_id', univId)

        const ruleIdsToDelete = (existingRules || [])
          .filter((r: any) => r.faculty?.includes(currentFaculty))
          .map((r: any) => r.id)

        if (ruleIdsToDelete.length > 0) {
          await supabase.from('scoring_rules').delete().in('id', ruleIdsToDelete)
        }

        const scoringRows = scoringRules.map((s: any, idx: number) => ({
          univ_id: univId,
          faculty: s.faculty || currentFaculty,
          chip: s.chip || currentFaculty,
          score: s.score || '',
          sub_desc: s.subDesc || '',
          display_order: idx + 1
        }))

        await supabase.from('scoring_rules').insert(scoringRows)
      }

      const rubrics = tab3_scoring.rubrics || []
      if (Array.isArray(rubrics) && rubrics.length > 0) {
        const { data: existingRubrics } = await supabase
          .from('university_rubrics')
          .select('id, category')
          .eq('univ_id', univId)

        const rubricIdsToDelete = (existingRubrics || [])
          .filter((rb: any) => rb.category?.includes(`[${currentFaculty}]`) || rb.category?.includes(currentFaculty))
          .map((rb: any) => rb.id)

        if (rubricIdsToDelete.length > 0) {
          await supabase.from('university_rubrics').delete().in('id', rubricIdsToDelete)
        }

        const rubricRows = rubrics.map((r: any, idx: number) => ({
          univ_id: univId,
          category: r.category?.includes(`[${currentFaculty}]`) ? r.category : `[${currentFaculty}] ${r.category || ''}`,
          ratio: r.ratio || '',
          description: r.desc || r.description || '',
          details: r.details || [],
          display_order: idx + 1
        }))

        const { error: rubricErr } = await supabase.from('university_rubrics').insert(rubricRows)
        if (rubricErr) {
          console.error('[Save All Tabs] Rubrics error:', rubricErr)
        }
      }
    }

    const savedTabsLabel = [
      shouldSaveTab1 ? '탭 1(기출문제)' : null,
      shouldSaveTab2 ? '탭 2(출제경향)' : null,
      shouldSaveTab3 ? '탭 3(채점기준)' : null
    ].filter(Boolean).join(', ')

    return NextResponse.json({
      success: true,
      message: `${univName} [${currentFaculty}] ${savedTabsLabel} 데이터가 Supabase DB에 안전하게 반영되었습니다!`,
      savedExamId,
      faculty: currentFaculty,
      savedTabs: { tab1: shouldSaveTab1, tab2: shouldSaveTab2, tab3: shouldSaveTab3 }
    })
  } catch (error: any) {
    console.error('[Save All Tabs Catch Error]:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}
