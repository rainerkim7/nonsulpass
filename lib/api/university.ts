/**
 * @file university.ts
 * @description Supabase DB 기반 대학별 논술 정보 및 3개 탭 데이터 페칭 모듈
 *              (하드코딩 폴백을 배제하고 100% Supabase DB 실시간 데이터만 반환)
 */

import { supabase } from '@/lib/supabase'
import {
  getUniversityName,
  getUniversityTracks,
  mergeUniversitiesWithDb,
  type UniversityMeta,
} from '@/lib/constants/universities'

/**
 * 전체 대학 목록 조회 (기본 프리셋 + DB 등록 신규 대학 + 기출 보유 활성화 상태 통합)
 */
export async function getAllMergedUniversities(): Promise<UniversityMeta[]> {
  try {
    const [univRes, examsRes] = await Promise.all([
      supabase.from('universities').select('id, name, is_active, faculty').order('created_at', { ascending: true }),
      supabase.from('exams').select('univ_id'),
    ])

    const dbUnivs = univRes.data || []
    const examUnivIds = Array.from(new Set((examsRes.data || []).map((e: any) => e.univ_id).filter(Boolean)))

    return mergeUniversitiesWithDb(dbUnivs, examUnivIds)
  } catch (err) {
    console.warn('[getAllMergedUniversities] DB 병합 조회 실패, 기본 목록 반환:', err)
    return mergeUniversitiesWithDb([], [])
  }
}

export interface UniversityData {
  id: string
  name: string
  faculty: string
  examDuration: string
  totalQuestions: string
  charPerQuestion: string
  examFormat: string
  isActive: boolean
}

export interface ExamItem {
  id: string
  univId: string
  year: string
  title: string
  type: '기출문제' | '모의논술' | '예상문제'
  targetFaculty: string
  totalTime: number
  totalLength: string
  level: string
  summary: string
}

export interface TrendItem {
  questionNumber: string
  questionType: string
  examTime: string
  scoreWeight: string
  questionTemplate: string
  passageStructure: {
    base: string
    targets: string
  }
  description: string
  writingFormula: {
    step: string
    title: string
    desc: string
    charGuide: string
  }[]
  frequentThemes: string[]
}

export interface ScoringRuleItem {
  faculty: string
  chip?: string
  score: string
  subDesc: string
}

export interface RubricItem {
  category: string
  ratio: string
  desc: string
  details: string[]
}

/**
 * 대학 기본 정보 및 시험 규격 조회 (DB 데이터 우선, 미등록 시 기본 메타데이터 반환)
 */
export async function getUniversity(univId: string): Promise<UniversityData> {
  try {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .eq('id', univId)
      .single()

    if (error || !data) {
      return {
        id: univId,
        name: getUniversityName(univId),
        faculty: getUniversityTracks(univId).join(' · ') || '인문·사회계열',
        examDuration: '100~120분',
        totalQuestions: '2~3문항',
        charPerQuestion: '문항당 800~1,000자',
        examFormat: '원고지 완결형 서술',
        isActive: false,
      }
    }

    return {
      id: data.id,
      name: data.name || getUniversityName(univId),
      faculty: data.faculty || getUniversityTracks(univId).join(' · '),
      examDuration: data.exam_duration || '120분',
      totalQuestions: data.total_questions || '2~3문항',
      charPerQuestion: data.char_per_question || '문항당 800~1,000자',
      examFormat: data.exam_format || '원고지 완결형 서술',
      isActive: Boolean(data.is_active),
    }
  } catch (err) {
    console.warn(`[getUniversity] 조회 오류 (${univId}):`, err)
    return {
      id: univId,
      name: getUniversityName(univId),
      faculty: getUniversityTracks(univId).join(' · ') || '인문·사회계열',
      examDuration: '100~120분',
      totalQuestions: '2~3문항',
      charPerQuestion: '문항당 800~1,000자',
      examFormat: '원고지 완결형 서술',
      isActive: false,
    }
  }
}

/**
 * 탭 1: 대학별 시험(기출/모의/예상) 목록 조회 (100% Supabase DB 기준)
 */
export async function getUniversityExams(univId: string): Promise<ExamItem[]> {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('univ_id', univId)
      .order('year', { ascending: false })

    if (error || !data || data.length === 0) {
      return []
    }

    return data.map((d: any) => ({
      id: d.id,
      univId: d.univ_id,
      year: String(d.year),
      title: d.title,
      type: d.type,
      targetFaculty: d.target_faculty,
      totalTime: d.total_time,
      totalLength: d.total_length,
      level: d.level,
      summary: d.summary,
    }))
  } catch (err) {
    console.warn(`[getUniversityExams] DB 조회 오류 (${univId}):`, err)
    return []
  }
}

/**
 * 특정 시험의 상세 정보 및 questions(문항/제시문) 단건 조회
 */
export async function getExamDetail(examId: string) {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch (err) {
    console.warn(`[getExamDetail] DB 조회 오류 (${examId}):`, err)
    return null
  }
}

/**
 * 탭 2: 대학별 출제 경향 및 유형 분석 조회 (100% Supabase DB 기준)
 */
export async function getUniversityTrends(univId: string): Promise<TrendItem[]> {
  try {
    const { data, error } = await supabase
      .from('university_trends')
      .select('*')
      .eq('univ_id', univId)
      .order('created_at', { ascending: true })

    if (error || !data || data.length === 0) {
      return []
    }

    return data.map((d: any) => ({
      questionNumber: d.question_number,
      questionType: d.question_type,
      examTime: d.exam_time,
      scoreWeight: d.score_weight,
      questionTemplate: d.question_template,
      passageStructure: d.passage_structure || { base: '', targets: '' },
      description: d.description,
      writingFormula: d.writing_formula || [],
      frequentThemes: d.frequent_themes || [],
    }))
  } catch (err) {
    console.warn(`[getUniversityTrends] DB 조회 오류 (${univId}):`, err)
    return []
  }
}

/**
 * 탭 3: 대학별 모집단위 배점 체계 및 공식 루브릭 조회 (100% Supabase DB 기준)
 */
export async function getUniversityRubrics(univId: string): Promise<{
  scoringRules: ScoringRuleItem[]
  rubrics: RubricItem[]
}> {
  try {
    const [rulesRes, rubricsRes] = await Promise.all([
      supabase.from('scoring_rules').select('*').eq('univ_id', univId).order('display_order', { ascending: true }),
      supabase.from('university_rubrics').select('*').eq('univ_id', univId).order('display_order', { ascending: true }),
    ])

    const scoringRules =
      rulesRes.data && rulesRes.data.length > 0
        ? rulesRes.data.map((r: any) => ({
            faculty: r.faculty,
            chip: r.chip,
            score: r.score,
            subDesc: r.sub_desc,
          }))
        : []

    const rubrics =
      rubricsRes.data && rubricsRes.data.length > 0
        ? rubricsRes.data.map((rb: any) => ({
            category: rb.category,
            ratio: rb.ratio,
            desc: rb.description,
            details: rb.details || [],
          }))
        : []

    return { scoringRules, rubrics }
  } catch (err) {
    console.warn(`[getUniversityRubrics] DB 조회 오류 (${univId}):`, err)
    return { scoringRules: [], rubrics: [] }
  }
}
